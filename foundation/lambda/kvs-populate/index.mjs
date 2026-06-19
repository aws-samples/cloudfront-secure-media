// CloudFormation custom-resource handler that copies the HMAC secret + issuer
// into the CloudFront KeyValueStore the CloudFront Function reads at runtime.
//
// CloudFront Functions can't call Secrets Manager, so we populate the KVS at
// deploy time. PutKey requires the store's current ETag, so we DescribeKeyValueStore
// first. The secret value is read here from Secrets Manager and never rendered
// into the CloudFormation template.
// The CloudFront KeyValueStore data-plane is signed with SigV4A. The signer is
// resolved at runtime from a registry that is populated ONLY as a side-effect of
// importing @aws-sdk/signature-v4a — the KVS client does not import it itself.
// Without this line the SDK throws "Neither CRT nor JS SigV4a implementation is
// available" even though the package is bundled. Must run before the first call.
import '@aws-sdk/signature-v4a';
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  PutKeyCommand,
} from '@aws-sdk/client-cloudfront-keyvaluestore';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const kvsClient = new CloudFrontKeyValueStoreClient({});
const sm = new SecretsManagerClient({});

async function putKey(kvsArn, key, value) {
  const described = await kvsClient.send(new DescribeKeyValueStoreCommand({ KvsARN: kvsArn }));
  await kvsClient.send(
    new PutKeyCommand({ KvsARN: kvsArn, Key: key, Value: value, IfMatch: described.ETag }),
  );
}

export const handler = async (event) => {
  const { RequestType, ResourceProperties } = event;
  if (RequestType === 'Delete') {
    return { PhysicalResourceId: event.PhysicalResourceId };
  }

  const { KvsArn, SecretArn, Issuer } = ResourceProperties;

  const secret = await sm.send(new GetSecretValueCommand({ SecretId: SecretArn }));
  // PutKey is one key at a time; ETag changes after each, so do them in sequence.
  await putKey(KvsArn, 'hmacSecret', secret.SecretString);
  await putKey(KvsArn, 'issuer', Issuer);

  return { PhysicalResourceId: `${KvsArn}-populate` };
};
