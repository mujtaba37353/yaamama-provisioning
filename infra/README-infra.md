# Infrastructure Setup Guide

## Servers

| Droplet | Purpose | IP | Account |
|---------|---------|-----|---------|
| **factory-01** | Factory API + Worker | `164.90.227.203` | DO Account 1 |
| **storehost-01** | WordPress Store Host | `134.209.251.204` | DO Account 2 |

## Domain

- **Domain:** `yaamama.store` (managed via DigitalOcean DNS, nameservers set in Hostinger)
- **Factory:** `factory.yaamama.store` → `164.90.227.203`
- **Staging wildcard:** `*.staging.yaamama.store` → `134.209.251.204`

## Phase 3: DigitalOcean Setup

### 1. DNS Configuration (DigitalOcean Account 1)

Add these DNS records in DigitalOcean Networking → Domains → `yaamama.store`:

```
Type: A    Name: factory          Value: 164.90.227.203   TTL: 3600
Type: A    Name: *.staging        Value: 134.209.251.204  TTL: 3600
Type: A    Name: @                Value: 134.209.251.204  TTL: 3600
```

### 2. SSH Key Setup (Factory → Store Host)

On the **Factory droplet** (`164.90.227.203`):

```bash
ssh-keygen -t ed25519 -f /root/.ssh/storehost_key -N ""
cat /root/.ssh/storehost_key.pub
```

Copy the public key to the **Store Host** (`134.209.251.204`):

```bash
# On Store Host:
echo "<PUBLIC_KEY>" >> /root/.ssh/authorized_keys
```

Test the connection from Factory:

```bash
ssh -i /root/.ssh/storehost_key root@134.209.251.204 "echo OK"
```

### 3. Firewall Rules

**Factory droplet** (`164.90.227.203`):
```bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw enable
```

**Store Host droplet** (`134.209.251.204`):
```bash
ufw allow 22/tcp from 164.90.227.203
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
