# Zod

**Pourquoi Zod (a mettre dans notes tech-lead)**

Zod est une lib de validation de schémas Typescript-first. Il prend un input utilisateur, le valide + la type.

**Ou faire de la validation de schémas ?**

Partout ou un input vient d'un utilisateur humain (peut se tromper ou etre malveillant)

On veut check:

- [x] Incription: email format, password longeur, caracteres requis, confirmation
- [x] Login: email format -> retour d'erreur avant un call API
- [x] Changement de MDP: ancien mdp présent, nouveau mdp -> respecte les critères
- [x] Création d'orga: nom non vide, longueur max, caractères autorisés
- [x] Création de dossier/renommage: non vide, longueur, pas de `/` ou caracteres qui casserait un path
- [x] Upload de fichier: taille max coté client, MIME type
- [ ] Profil utilisateur: Formatage nom/prenom


**Ce qu'on en tire**

On attrape les erreurs avant les call API, pas de pollution des logs backend avec des requetes invalides.


**Ordre de priorité d'implémentation**

register -> change password -> create org -> create folder -> upload -> rename user
