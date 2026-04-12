# Siders Pixel

Site vitrine 100% statique compatible GitHub Pages.

## Structure

- `index.html` : point d'entree racine pour GitHub Pages
- `404.html` : page de secours avec redirection vers l'accueil
- `html/` : pages du site
- `assets/` : feuilles de style et scripts front-end
- `image/` : medias du site
- `.nojekyll` : desactive le traitement Jekyll sur GitHub Pages

## Formulaire de contact

Le formulaire de contact fonctionne sans backend local. L'envoi est effectue directement depuis le navigateur via `FormSubmit`.

Important :

1. Lors du premier envoi, `FormSubmit` peut demander une validation de l'adresse `pixelsiders71@gmail.com`.
2. Tant que cette validation n'est pas faite, les messages peuvent ne pas etre livres.
3. Le formulaire garde une validation front-end et un envoi de secours via l'attribut HTML `action`.

## Deploiement GitHub Pages

1. Pousser le projet sur un depot GitHub.
2. Ouvrir `Settings > Pages`.
3. Dans `Build and deployment`, choisir `Deploy from a branch`.
4. Selectionner la branche souhaitee, par exemple `main`.
5. Choisir le dossier `/ (root)`.
6. Enregistrer puis attendre la publication.

## Verification apres mise en ligne

Verifier les points suivants :

1. L'URL principale ouvre bien `index.html` puis redirige vers `html/index.html`.
2. Les pages `Services`, `A propos`, `Portfolio`, `Contact` et `Mentions legales` se chargent correctement.
3. Le formulaire de contact s'envoie sans requete vers `localhost`.
4. La console du navigateur ne remonte aucune erreur liee a un serveur Node.js.

Le site ne necessite ni Node.js, ni API locale, ni serveur applicatif pour fonctionner.
