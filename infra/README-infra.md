# Infrastructure Setup Guide

## Phase 3: DigitalOcean Setup

### 1. Create Droplets

Create two droplets via DigitalOcean dashboard (https://cloud.digitalocean.com):

| Droplet | Purpose | Min Specs | OS |
|---------|---------|-----------|-----|
| **factory-01** | Factory API + Worker | 2GB RAM, 1 vCPU | Ubuntu 22.04 |
| **storehost-01** | WordPress Store Host | 4GB RAM, 2 vCPU | Ubuntu 22.04 |

### 2. DNS Configuration

In your domain's DNS settings, add a **wildcard A record** for staging:

```
Type: A
Name: *.staging
Value: <STORE_HOST_IP>
TTL: 3600
```

This makes `anything.staging.yourdomain.com` point to the Store Host.

### 3. SSH Key Setup (Factory -> Store Host)

On the **Factory droplet**, generate a key for connecting to Store Host:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/storehost_key -N ""
cat /root/.ssh/storehost_key.pub
```

Copy the public key to the **Store Host**:

```bash
# On Store Host:
echo "<PUBLIC_KEY>" >> /root/.ssh/authorized_keys
```

Test the connection from Factory:

```bash
ssh -i /root/.ssh/storehost_key root@<STORE_HOST_IP> "echo OK"
```

### 4. Firewall Rules

**Factory droplet:**
```bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw enable
```

**Store Host droplet:**
```bash
ufw allow 22/tcp from <FACTORY_IP>
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
