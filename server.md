Server IP: 192.168.88.111
ssh user name: mssadmin
ssh password: <redacted>
sudo password: <redacted>

running container: rms-reqmgmt

app path (container): /app
db path (container): /app/data/rms.db

auto increase minor version number after each code update, and update version.md too.

deploy/update (PowerShell, uses Posh-SSH):
1) Install module (once):
   Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
2) Credentials:
   $sec = ConvertTo-SecureString '<password>' -AsPlainText -Force
   $cred = New-Object System.Management.Automation.PSCredential('mssadmin', $sec)
3) Upload files to server:
   Set-SCPItem -ComputerName 192.168.88.111 -Credential $cred -Path <local_file> -Destination /home/mssadmin/rms-update -AcceptKey
4) Copy into container:
   echo <password> | sudo -S docker cp /home/mssadmin/rms-update/<file> rms-reqmgmt:/app/<file>

db migration helper (inside container):
- Backup:
  echo <password> | sudo -S docker exec rms-reqmgmt sh -c "cp /app/data/rms.db /app/data/rms.db.bak-<stamp>"
- Run node with sqlite3:
  echo <password> | sudo -S docker exec -e NODE_PATH=/app/node_modules rms-reqmgmt node /tmp/migrate.js
