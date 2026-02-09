# Remote Publish Instructions

This document describes how to deploy the `dist` folder to the remote server.

## Prerequisites

- SSH access to `root@89.116.134.190`
- `zip` utility (or PowerShell `Compress-Archive`) locally
- `unzip` utility on the remote server

## Steps

### 1. Build the Project
Ensure you have the latest build.
```bash
yarn run build
```

### 2. Zip the `dist` Folder
Create a zip file of the **contents** of the `dist` directory.

**Windows (PowerShell):**
```powershell
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
```

**Mac/Linux:**
```bash
cd dist && zip -r ../dist.zip . && cd ..
```

### 3. Upload to Server
Upload the zip file to the target directory.
```bash
scp dist.zip root@89.116.134.190:/var/www/agribbee/isolarsea/
```

### 4. Unzip on Server
Connect to the server and extract the files.
```bash
ssh root@89.116.134.190 "cd /var/www/agribbee/isolarsea && unzip -o dist.zip && rm dist.zip"
```

## One-Liner (PowerShell)
```powershell
yarn run build; Compress-Archive -Path dist\* -DestinationPath dist.zip -Force; scp dist.zip root@89.116.134.190:/var/www/agribbee/isolarsea/; ssh root@89.116.134.190 "cd /var/www/agribbee/isolarsea && unzip -o dist.zip && rm dist.zip"
```
