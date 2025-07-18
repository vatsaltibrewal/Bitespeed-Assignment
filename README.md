# Bitespeed Backend Task: Identity Reconciliation Service

This project is a solution to the Bitespeed Backend Developer Task. It's a NodeJS and Express.js web service designed for identity reconciliation, allowing a platform to consolidate contact information for a single customer who might use different emails or phone numbers across multiple orders.

The service exposes a single API endpoint, `/identify`, which receives contact information and returns a consolidated profile, effectively tracking a customer's digital footprint within the system.

**Deployed URL:** https://bitespeed-assignment-kjq6.onrender.com 

## Core Features

- **Contact Identification:** Identifies users based on a provided email and phone number.
- **Contact Consolidation:** Merges multiple contact entries into a single, unified profile.
- **Primary & Secondary Linking:** The first-seen contact for a user is marked as "primary," and all subsequent linked contacts are marked as "secondary."
- **Dynamic Merging:** If a request links two previously separate primary contacts, the older contact remains primary, and the newer one is updated to become secondary.
- **New Contact Creation:** If no existing contact matches the request, a new "primary" contact is created.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Render

## API Endpoint Documentation

The service provides one primary endpoint for all identity operations.

### `POST /identity`

This endpoint is the core of the service. It identifies a customer based on the provided `email` and `phoneNumber`. It then returns the consolidated contact information.

- **URL:** `https://bitespeed-assignment-kjq6.onrender.com/identify`
- **Method:** `POST`
- **Headers:**
  - `Content-Type`: `application/json`

---

#### **Request Body**

The request body must be a JSON object containing both an `email` and a `phoneNumber`.

```json
{
	"email": "string",
	"phoneNumber": "string"
}
```

**Example Request:**

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

---

#### **Success Response (200 OK)**

If the request is successful, the service returns a JSON object containing a `contact` key.

```json
{
  "contact": {
    "primaryContactId": number,
    "emails": ["string"],          // The first email is the primary contact's email
    "phoneNumbers": ["string"],     // The first phone number is the primary contact's number
    "secondaryContactIds": [number] // An array of IDs of all secondary contacts
  }
}
```

**Example Response:**

```json
{
    "contact": {
        "primaryContactId": 1,
        "emails": [
            "lorraine@hillvalley.edu",
            "mcfly@hillvalley.edu"
        ],
        "phoneNumbers": [
            "123456"
        ],
        "secondaryContactIds": [
            23
        ]
    }
}
```

---

#### **Example `curl` Command**

You can test the live endpoint using a `curl` command like this:

```bash
curl -X POST https://https://bitespeed-assignment-kjq6.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```
