var config = {};

config.REGION = process.env.AWS_REGION;
config.USERPOOLID = "us-east-1_DRBoVcEDj"; // please add you cognito user pool id, you can run amplify auth console and select 'User Pool option'
config.JWKS =
  '{"keys":[{"alg":"RS256","e":"AQAB","kid":"lEpBAGaRbWs8ErEq8+q+11psTXahTixNIe7v3DcOQiU=","kty":"RSA","n":"l386VbwpGsFML-g_mwbh7ivdwT6m0JTp2F4h2rJ-Z9y7hBwKhHYMPnMMzXXnE-MUlSkD05Amvk7ZsN7kRHIv8uQnwXaAm8SQNl9e7SJOd_PlI4GzB_uBMhd_V7Z4ijpBHTmStDO8ff3cg6GNW4EVpv9Ux7EaU7vuC6Ace_TcgSpqqJ5wsPp7TAhtJS5JwIG2In86kLgQ8caa1Yd4lC0y7xLLeC1dZ-8m4DRClPs1xrO5840i2xanrOMrbAnSvSfNEGSDVN-T2FKs4N4e2h0jmve0BorCrVCsus5gpzr4MJ4SJlhfELh9dhUhXji3KpMkLA0y3IZrJRIBYveEi-9WeQ","use":"sig"},{"alg":"RS256","e":"AQAB","kid":"X7bZrqnWFxtFKDtIlqphlblmMtrCCnTCVSqZ5BFFlLM=","kty":"RSA","n":"uyCyrAgzqpGMxhvnFexZU8bocg9v7omFo35O6j9xHaG4Q0UYFfFCj-3SkT1R_UjBbdTWLNQk3gVENUJRlHdffZKkXzQD_drglt5DZ0inWqsipePB4ZzTGKJgw7QftxbKYmbTIfEjDQJEHkvKU2CLLsho_-0MxMd_nwSP0gc1JixMqPvooIaR0dpJVNZ8TullxWnAxx4gsW0xdm20MGy33t-qNlOsocZY8bfXzKOq0jNzfsl4wb8iop93-JWImBBhkDF-mBTqFeMmRcmBFq4geq_tYWT0yKeb63o_gXl68BX7z_CKA-j5wZmwXXE8L8Cvqr7CtdebXeWvhS1T5ZMaAw","use":"sig"}]}';

module.exports = config;
