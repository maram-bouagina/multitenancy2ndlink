# Critères d'acceptation — Configuration de la boutique

User stories **STORE-002** et **STORE-003** du module Gestion de Boutique.

---

## STORE-002 — Consulter et configurer les informations de la boutique

> **En tant que** commerçant, **je veux** consulter les informations de ma boutique et vérifier sa configuration, **afin de** garder à jour les fonctionnalités que je veux.

### Critères d'acceptation

#### Affichage général
- [ ] `AC-002-01` — La page de configuration s'ouvre depuis le dashboard merchant via `/dashboard/stores/{id}`.
- [ ] `AC-002-02` — Le nom de la boutique et son slug sont affichés dans l'en-tête de la page.
- [ ] `AC-002-03` — Le statut actuel de la boutique est visible sous forme de badge coloré (vert = active, orange = maintenance, rouge = suspendue).
- [ ] `AC-002-04` — Un lien "Voir la boutique" permet d'ouvrir le storefront public dans un nouvel onglet.

#### Onglet Informations générales
- [ ] `AC-002-05` — Le champ **slug** est affiché en lecture seule avec un bouton de copie dans le presse-papier.
- [ ] `AC-002-06` — Le commerçant peut modifier le **nom** de la boutique (champ obligatoire, min. 1 caractère).
- [ ] `AC-002-07` — Le commerçant peut renseigner ou modifier l'**email de contact** (validation format email).
- [ ] `AC-002-08` — Le commerçant peut renseigner ou modifier le **numéro de téléphone**.
- [ ] `AC-002-09` — Le commerçant peut renseigner ou modifier l'**adresse postale**.
- [ ] `AC-002-10` — Le commerçant peut renseigner ou modifier le **numéro de TVA / matricule fiscal**.
- [ ] `AC-002-11` — Un bouton "Enregistrer les modifications" déclenche l'appel `PUT /api/stores/{id}` et affiche un message de succès.
- [ ] `AC-002-12` — Si la requête échoue, un message d'erreur explicite est affiché sans quitter la page.

#### Onglet Localisation
- [ ] `AC-002-13` — La **langue de la boutique** est sélectionnable via un menu déroulant avec les options :
  - 🇫🇷 Français (`fr`)
  - 🇬🇧 English (`en`)
  - 🇸🇦 العربية (`ar`)
- [ ] `AC-002-14` — Lorsque la langue **arabe** est sélectionnée, une alerte d'information indique que la mise en page passera en sens droite-à-gauche (RTL).
- [ ] `AC-002-15` — La **devise** est sélectionnable via un menu déroulant (EUR, USD, GBP, TND, MAD, DZD, SAR, AED, CAD, CHF, JPY, CNY).
- [ ] `AC-002-16` — Le **fuseau horaire** est sélectionnable via un menu déroulant groupé par région géographique (Afrique du Nord, Moyen-Orient, Europe, Amériques, Asie-Pacifique, UTC).
- [ ] `AC-002-17` — La sauvegarde des paramètres de localisation appelle `PUT /api/stores/{id}` et affiche un message de succès.

#### Création d'une nouvelle boutique (`/dashboard/stores/new`)
- [ ] `AC-002-18` — Les champs langue, devise et fuseau horaire utilisent des menus déroulants (non des champs texte libres).
- [ ] `AC-002-19` — Le slug est saisi manuellement lors de la création (format : lettres minuscules, chiffres, tirets).
- [ ] `AC-002-20` — Le formulaire de création déclenche `POST /api/stores` avec tous les champs requis.

---

## STORE-003 — Désactiver temporairement la boutique pour maintenance

> **En tant que** commerçant, **je veux** désactiver temporairement ma boutique, **afin qu'elle** ne soit plus accessible pendant une maintenance.

### Critères d'acceptation

#### Activation du mode maintenance
- [ ] `AC-003-01` — Dans l'onglet **Statut & Maintenance**, le commerçant voit le statut actuel de la boutique.
- [ ] `AC-003-02` — Lorsque la boutique est **active**, un bouton "Mettre en maintenance" est affiché.
- [ ] `AC-003-03` — Cliquer sur "Mettre en maintenance" ouvre une boîte de dialogue de confirmation indiquant que la boutique sera immédiatement inaccessible au public.
- [ ] `AC-003-04` — La confirmation déclenche `PATCH /api/stores/{id}/status` avec `{ "status": "inactive" }`.
- [ ] `AC-003-05` — Après désactivation, le badge de statut passe à "Maintenance" et une bannière d'avertissement s'affiche en haut de la page.

#### Réactivation de la boutique
- [ ] `AC-003-06` — Lorsque la boutique est en **maintenance**, un bouton "Réactiver la boutique" est affiché.
- [ ] `AC-003-07` — Cliquer sur "Réactiver la boutique" ouvre une boîte de dialogue de confirmation.
- [ ] `AC-003-08` — La confirmation déclenche `PATCH /api/stores/{id}/status` avec `{ "status": "active" }`.
- [ ] `AC-003-09` — Après réactivation, le badge repasse à "Active" et la bannière d'avertissement disparaît.

#### Message personnalisé de maintenance
- [ ] `AC-003-10` — Un champ texte permet de saisir un **message personnalisé** visible par les visiteurs pendant la maintenance (max. 500 caractères).
- [ ] `AC-003-11` — Si aucun message n'est saisi, un message par défaut en français est affiché aux visiteurs.
- [ ] `AC-003-12` — Le message de maintenance est sauvegardé indépendamment via `PUT /api/stores/{id}` (champ `maintenance_message`).

#### Expérience visiteur (storefront)
- [ ] `AC-003-13` — Lorsqu'un visiteur accède à l'URL d'une boutique en maintenance, le serveur retourne une réponse HTTP **503**.
- [ ] `AC-003-14` — Le storefront affiche une page de maintenance dédiée (icône 🔧, nom de la boutique, message personnalisé ou par défaut).
- [ ] `AC-003-15` — La page de maintenance n'est **pas** une page 404 — le slug reste valide et la boutique retrouve son état normal après réactivation.

#### Boutique suspendue (admin plateforme)
- [ ] `AC-003-16` — Le commerçant **ne peut pas** modifier le statut d'une boutique dont le statut est `suspended`.
- [ ] `AC-003-17` — L'onglet Statut affiche un message d'information expliquant que la boutique a été suspendue par l'administration.
- [ ] `AC-003-18` — L'API retourne une erreur si `PATCH /api/stores/{id}/status` est appelé sur une boutique suspendue.

---

## Règles métier communes

| Règle | Description |
|---|---|
| Isolation multi-tenant | Un commerçant ne peut consulter/modifier que les boutiques appartenant à son tenant. |
| Authentification | Toutes les routes `/api/stores/*` exigent un JWT merchant valide (middleware `RequireAuth`). |
| Slugs immuables | Le slug d'une boutique ne peut pas être modifié après sa création. |
| Statuts disponibles | `active` (public), `inactive` (maintenance, contrôlé par le commerçant), `suspended` (verrouillé par l'admin). |
| Transition de statut | Seul `active ↔ inactive` est autorisé côté commerçant. `suspended` est exclusivement géré par l'admin plateforme. |

---

## Endpoints impactés

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/api/stores/:id` | Récupérer la configuration complète |
| `PUT` | `/api/stores/:id` | Mettre à jour nom, email, localisation, message maintenance, etc. |
| `PATCH` | `/api/stores/:id/status` | Basculer `active` ↔ `inactive` |
| `GET` | `/s/:slug/*` | Storefront public — retourne 503 si inactive/suspended |
