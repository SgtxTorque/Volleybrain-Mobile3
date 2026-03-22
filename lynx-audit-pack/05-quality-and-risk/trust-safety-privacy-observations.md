# Trust, Safety, And Privacy Observations

## Confirmed observations

- Legal routes exist:
  - `/privacy-policy`
  - `/terms-of-service`
  - `/data-rights`
- Notification preferences exist.
- Auth logout clears several persisted context keys to reduce cross-user leakage.

## Partial or unverified observations

- Parent and child data is sensitive, but backend access safety cannot be confirmed from client code.
- Payment and registration flows handle family and org data, but no end-to-end privacy policy enforcement can be proven here.
- Some account-linkage logic uses email matching on player records, which is operationally convenient but increases data-integrity sensitivity.

## Conclusion

The app shows clear intent to support trust and privacy features, but client code alone cannot prove policy completeness or server-side enforcement.
