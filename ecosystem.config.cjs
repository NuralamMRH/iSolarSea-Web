module.exports = {
  apps: [
    {
      name: "itrucksea-frontend",
      script: "npx",
      args: "vite preview --port 5173 --mode production",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5173,
      },
    },
    {
      name: "itrucksea-backend",
      script: "tsx",
      args: "server.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
    },
  ],
};

//pm2 start "npx vite --port 5173" --name itrucksea-frontend --env NODE_ENV=production

// pm2 start "npx tsx server.ts" --name itrucksea-backend --env NODE_ENV=production
