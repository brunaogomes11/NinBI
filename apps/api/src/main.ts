import { existsSync } from 'node:fs'

// Em dev, lê apps/api/.env; variáveis já presentes no ambiente (Docker, CI) não são sobrescritas.
if (existsSync('.env')) process.loadEnvFile('.env')

// Import dinâmico: os módulos só carregam depois que o .env já está em process.env.
void import('./bootstrap.js').then(({ bootstrap }) => bootstrap())
