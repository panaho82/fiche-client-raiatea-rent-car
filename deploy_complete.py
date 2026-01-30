#!/usr/bin/env python3
"""
Déploiement automatique complet sur Dokploy
RAIATEA RENT CAR
"""

import paramiko
import time
import sys
from pathlib import Path

# Configuration
SERVER = "62.146.172.163"
USERNAME = "root"
PASSWORD = "08061982"
PORT = 22

class DokployDeployer:
    def __init__(self):
        self.client = None
        self.sftp = None
        
    def connect(self):
        """Connexion SSH au serveur"""
        print("🔌 Connexion au serveur Dokploy...")
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.client.connect(
                hostname=SERVER,
                port=PORT,
                username=USERNAME,
                password=PASSWORD,
                timeout=10
            )
            self.sftp = self.client.open_sftp()
            print("✅ Connecté avec succès!")
            return True
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")
            return False
    
    def execute(self, command, print_output=True):
        """Exécuter une commande SSH"""
        stdin, stdout, stderr = self.client.exec_command(command)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if print_output and output:
            print(output)
        if error and exit_code != 0:
            print(f"⚠️ Erreur: {error}")
            
        return exit_code, output, error
    
    def upload_file(self, local_path, remote_path):
        """Upload un fichier"""
        try:
            self.sftp.put(local_path, remote_path)
            print(f"✅ Uploaded: {Path(local_path).name}")
            return True
        except Exception as e:
            print(f"❌ Erreur upload {local_path}: {e}")
            return False
    
    def upload_directory(self, local_dir, remote_dir):
        """Upload un dossier récursivement"""
        local_path = Path(local_dir)
        
        try:
            # Créer le dossier distant
            try:
                self.sftp.mkdir(remote_dir)
            except:
                pass
            
            for item in local_path.rglob('*'):
                if item.is_file():
                    relative_path = item.relative_to(local_path)
                    remote_file = f"{remote_dir}/{relative_path}".replace('\\', '/')
                    
                    # Créer les sous-dossiers
                    remote_subdir = '/'.join(remote_file.split('/')[:-1])
                    try:
                        self.sftp.mkdir(remote_subdir)
                    except:
                        pass
                    
                    self.upload_file(str(item), remote_file)
            
            print(f"✅ Dossier {local_dir} uploadé")
            return True
        except Exception as e:
            print(f"❌ Erreur upload dossier: {e}")
            return False
    
    def deploy_mysql(self):
        """Déployer MySQL"""
        print("\n🗄️  DÉPLOIEMENT MYSQL")
        print("=" * 50)
        
        # Arrêter l'ancien conteneur
        self.execute("docker rm -f raiatea-mysql 2>/dev/null || true", False)
        
        # Créer le conteneur MySQL
        mysql_cmd = """docker run -d \
  --name raiatea-mysql \
  --network bridge \
  -e MYSQL_ROOT_PASSWORD=rootpass2024secure \
  -e MYSQL_DATABASE=raiatea_db \
  -e MYSQL_USER=raiatea \
  -e MYSQL_PASSWORD=raiatea2024password \
  -p 3306:3306 \
  --restart unless-stopped \
  -v raiatea-mysql-data:/var/lib/mysql \
  mysql:8.0"""
        
        code, output, error = self.execute(mysql_cmd)
        if code == 0:
            print("✅ MySQL démarré")
        else:
            print(f"⚠️ MySQL: {error}")
        
        print("⏳ Attente du démarrage MySQL (30s)...")
        time.sleep(30)
        
        # Vérifier MySQL
        code, output, error = self.execute(
            "docker exec raiatea-mysql mysqladmin -u root -prootpass2024secure ping",
            False
        )
        if code == 0:
            print("✅ MySQL opérationnel")
        else:
            print("⚠️ MySQL pas encore prêt, attente supplémentaire...")
            time.sleep(15)
        
        return True
    
    def prepare_app_files(self):
        """Préparer les fichiers de l'application"""
        print("\n📂 PRÉPARATION DES FICHIERS")
        print("=" * 50)
        
        # Créer le dossier
        self.execute("mkdir -p /root/raiatea-app")
        
        # Upload Dockerfile
        self.upload_file("Dockerfile", "/root/raiatea-app/Dockerfile")
        self.upload_file(".dockerignore", "/root/raiatea-app/.dockerignore")
        self.upload_file("package.json", "/root/raiatea-app/package.json")
        
        # Upload server
        self.upload_file("server-dokploy.js", "/root/raiatea-app/server.js")
        
        # Upload public/
        self.upload_directory("public", "/root/raiatea-app/public")
        
        # Créer .env
        env_content = """NODE_ENV=production
PORT=3000

DB_HOST=raiatea-mysql
DB_USER=raiatea
DB_PASSWORD=raiatea2024password
DB_NAME=raiatea_db
DB_PORT=3306

RESEND_API_KEY=REMPLACER_PAR_VRAIE_CLE
RESEND_FROM=contact@raiatearentcar.com
EMAIL_TO=raiatearentcar@mail.pf

ALLOWED_ORIGINS=https://form.raiatearentcar.com
ALLOW_FULL_CARD=false
ALLOWED_CARD_BRANDS=visa,mastercard
"""
        
        self.execute(f"cat > /root/raiatea-app/.env << 'ENVEOF'\n{env_content}\nENVEOF")
        print("✅ Fichier .env créé")
        
        print("\n⚠️  IMPORTANT: La clé RESEND_API_KEY doit être configurée!")
        print("   ssh root@62.146.172.163")
        print("   nano /root/raiatea-app/.env")
        
        return True
    
    def build_and_run(self):
        """Build et démarrage de l'application"""
        print("\n🐳 BUILD DOCKER")
        print("=" * 50)
        
        # Build
        code, output, error = self.execute(
            "cd /root/raiatea-app && docker build -t raiatea-app:latest ."
        )
        
        if code != 0:
            print("❌ Erreur de build")
            return False
        
        print("✅ Image Docker créée")
        
        print("\n🚀 DÉMARRAGE APPLICATION")
        print("=" * 50)
        
        # Arrêter l'ancien conteneur
        self.execute("docker rm -f raiatea-app 2>/dev/null || true", False)
        
        # Démarrer le nouveau
        run_cmd = """docker run -d \
  --name raiatea-app \
  --network bridge \
  --link raiatea-mysql:mysql \
  -p 3000:3000 \
  --restart unless-stopped \
  -v raiatea-pdfs:/app/pdfs \
  --env-file /root/raiatea-app/.env \
  raiatea-app:latest"""
        
        code, output, error = self.execute(run_cmd)
        
        if code == 0:
            print("✅ Application démarrée")
        else:
            print(f"❌ Erreur démarrage: {error}")
            return False
        
        print("⏳ Attente du démarrage (15s)...")
        time.sleep(15)
        
        return True
    
    def verify_deployment(self):
        """Vérifier le déploiement"""
        print("\n✅ VÉRIFICATION")
        print("=" * 50)
        
        # Conteneurs actifs
        code, output, error = self.execute("docker ps | grep raiatea")
        print(output)
        
        # Health check
        code, output, error = self.execute(
            "curl -s http://localhost:3000/status || echo 'App pas encore prête'",
            False
        )
        print(f"Health check: {output}")
        
        return True
    
    def deploy(self):
        """Déploiement complet"""
        print("\n" + "=" * 50)
        print("🚀 DÉPLOIEMENT AUTOMATIQUE DOKPLOY")
        print("   RAIATEA RENT CAR")
        print("=" * 50 + "\n")
        
        if not self.connect():
            return False
        
        try:
            # Étapes du déploiement
            self.deploy_mysql()
            self.prepare_app_files()
            self.build_and_run()
            self.verify_deployment()
            
            print("\n" + "=" * 50)
            print("✅ DÉPLOIEMENT TERMINÉ !")
            print("=" * 50)
            print(f"\n🌐 Application accessible sur: http://{SERVER}:3000")
            print(f"🏥 Health check: http://{SERVER}:3000/status")
            print(f"\n⚠️  N'oubliez pas de configurer RESEND_API_KEY dans .env !")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            if self.sftp:
                self.sftp.close()
            if self.client:
                self.client.close()

if __name__ == "__main__":
    deployer = DokployDeployer()
    success = deployer.deploy()
    sys.exit(0 if success else 1)
