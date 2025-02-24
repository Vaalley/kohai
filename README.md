# Kohai - REST API Backend

A simple REST API backend server built with Deno and Hono.

Kohai is a web application that enables users to associate descriptive words
with movies and video games, creating a crowd-sourced tagging system. Users can
view aggregated popular tags for each piece of media, providing an organic,
community-driven description system.

## Technologies Used

- [Deno](https://deno.com/) - Modern runtime for JavaScript and TypeScript.
- [Hono](https://hono.dev/) - Small, fast framework for the web.

## How to Run

1. **Ensure Deno is installed:** If you haven't already, install Deno from
   [https://deno.com/](https://deno.com/).
2. **Clone the repository:** `git clone https://github.com/Vaalley/kohai.git`
   and `cd kohai`.
3. **Ensure your .env file is set up:** Copy the `.env.example` file to `.env`
   and update the values as needed.
4. **Install dependencies:** Run `deno install` to install any missing
   dependencies.
5. **Run the server:** Execute the following command in your terminal:

   ```bash
   deno task dev
   ```
