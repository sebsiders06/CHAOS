# Siders Pixel

## Formulaire de contact

Le site utilise maintenant une API locale d'envoi d'e-mail via `Node.js` et `Nodemailer`.

### Installation

1. Installer Node.js sur la machine si ce n'est pas déjà fait.
2. Dans le dossier du projet, installer les dépendances :

```bash
npm install
```

3. Copier `.env.example` vers `.env`.
4. Renseigner les variables SMTP dans `.env`.
5. Lancer le serveur :

```bash
npm start
```

Le site sera servi sur `http://localhost:3000` par défaut.

### Variables d'environnement

- `PORT` : port du serveur local
- `SMTP_HOST` : serveur SMTP
- `SMTP_PORT` : port SMTP
- `SMTP_SECURE` : `true` ou `false`
- `SMTP_USER` : identifiant SMTP
- `SMTP_PASS` : mot de passe SMTP
- `CONTACT_TO_EMAIL` : adresse destinataire des messages
- `CONTACT_FROM_EMAIL` : adresse expéditrice utilisée par le serveur

### Sécurité

- Les identifiants SMTP restent côté serveur uniquement.
- Le formulaire inclut une validation basique côté client et côté serveur.
- Un champ honeypot bloque les robots simples.
- Une limitation simple du nombre de requêtes est appliquée par adresse IP.
