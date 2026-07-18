# Host Takeover Architecture

The Host Takeover feature allows an assistant or secondary device to assume the Host role if the original Host drops offline.

## Security
When a game session is created, a secure 6-digit `takeoverPIN` is generated. This PIN is returned to the original Host exactly once.
The backend hashes this PIN using a generated salt and stores the hash in a secure, private Firestore document (`sessions/{sessionId}/private/config`) that clients cannot read.

## Mechanism
To take over the session:
1. The new host calls the `claimHostLease` Cloud Function, providing the `sessionId` and the 6-digit `takeoverPIN`.
2. The function retrieves the stored salt, hashes the provided PIN, and compares it to the stored hash.
3. If valid, the function updates the `hostLease` node in RTDB, setting the `hostId` to the new user's UID.
4. Security Rules automatically grant the new host full access to the `host` and `commandHistory` nodes.
