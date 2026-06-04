# 5G NR Calculadora

Aplicativo móvel (React Native + Expo) com duas calculadoras de engenharia de
rede 5G NR e um histórico de cálculos salvos servido por uma API Node.js/Express.

- **Throughput (TS 38.214)** — taxa de pico de DL/UL a partir da numerologia,
  largura de banda, modulação, camadas MIMO e agregação de portadoras.
- **Link Budget** — sensibilidade do receptor, MAPL e raio de célula (modelo de
  espaço livre).
- **Histórico** — resultados salvos na nuvem (lista, criação e exclusão) via API.

Os cálculos rodam no dispositivo; o histórico é persistido pela API.

## Arquitetura

Monorepo gerenciado por **pnpm** com artefatos independentes:

| Pasta | Descrição |
| --- | --- |
| `artifacts/mobile` | App Expo (frontend React Native) |
| `artifacts/api-server` | API Node.js/Express (backend) |
| `lib/api-spec` | Contrato OpenAPI (fonte da verdade da API) |
| `lib/api-client-react` | Cliente React Query gerado a partir do OpenAPI |
| `lib/api-zod` | Schemas de validação Zod gerados a partir do OpenAPI |

O fluxo é **spec-first**: edite `lib/api-spec/openapi.yaml`, rode o codegen e o
cliente (hooks React Query) e os schemas Zod são regenerados automaticamente.

## Como executar

Os serviços rodam como workflows do Replit, mas podem ser iniciados manualmente:

### Backend (API)

```bash
pnpm --filter @workspace/api-server run dev
```

Endpoints (montados em `/api`):

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/calculations` | Lista os cálculos salvos |
| `POST` | `/api/calculations` | Cria um cálculo (validado por Zod) |
| `DELETE` | `/api/calculations/:id` | Remove um cálculo |

### Frontend (mobile)

```bash
pnpm --filter @workspace/mobile run dev
```

Abra a pré-visualização (web) ou escaneie o QR Code com o Expo Go.

## Rodar no Android Studio (emulador)

O app pode ser executado no emulador do Android Studio em **qualquer
computador** e **qualquer rede**. A URL da API é configurável: defina
`EXPO_PUBLIC_API_URL` (veja `artifacts/mobile/.env.example`). Os cálculos
funcionam offline; apenas o Histórico precisa da API.

### Pré-requisitos

- Node.js LTS e **pnpm** (`npm i -g pnpm`)
- Android Studio com um **emulador (AVD)** criado no Device Manager
- JDK 17 (instalado junto com o Android Studio)

### 1. Deixe a API acessível

A API precisa estar acessível pela internet para funcionar em qualquer rede.

- **Opção A (recomendada) — publicar no Replit:** clique em **Publish/Deploy**.
  Você recebe uma URL fixa `https://<seu-app>.replit.app`; a API fica em
  `https://<seu-app>.replit.app/api`.
- **Opção B — API local (mesma máquina):** rode
  `PORT=8080 pnpm --filter @workspace/api-server run dev`. O emulador acessa o
  host da máquina pela URL especial `http://10.0.2.2:8080`.

### 2. Configure a URL da API

```bash
cp artifacts/mobile/.env.example artifacts/mobile/.env
```

No `artifacts/mobile/.env`, descomente **uma** das opções (use apenas a
origem, **sem** o caminho `/api` — o cliente já o adiciona):

```bash
# Opção A
EXPO_PUBLIC_API_URL=https://<seu-app>.replit.app
# Opção B
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

### 3. Instale as dependências (na raiz)

```bash
pnpm install
```

### 4. Inicie o emulador

No Android Studio: **Device Manager → ▶** para abrir o AVD.

### 5. Rode o app no emulador

**Opção A — Expo Go (recomendada, mais simples):** com o emulador aberto, rode o
Metro e pressione `a` — o app é instalado e aberto no emulador automaticamente.

```bash
cd artifacts/mobile
pnpm exec expo start
# pressione "a" quando o Metro iniciar
```

**Opção B — Build nativo (gera o projeto Android para o Android Studio):**

> Pré-requisito do monorepo pnpm: o `expo run:android` usa o autolinking do
> Gradle, que precisa dos módulos nativos "achatados" em `node_modules`. Crie
> `artifacts/mobile/.npmrc` com `node-linker=hoisted` e rode `pnpm install` na
> raiz **antes** do build. (O Expo Go da Opção A não exige isso.)

```bash
cd artifacts/mobile
pnpm exec expo run:android
```

Isso gera a pasta `artifacts/mobile/android/`, que pode ser aberta diretamente no
Android Studio em **Open → artifacts/mobile/android**.

> Observação: na Opção B do passo 1 (API local via `http://10.0.2.2`) o tráfego
> é HTTP sem TLS; em builds de desenvolvimento o Android permite isso por padrão.

### Regenerar o cliente da API

Após editar `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Verificação de tipos

```bash
pnpm --filter @workspace/mobile run typecheck
```

## Estrutura do app móvel

- `app/index.tsx` — tela inicial com os cards das calculadoras e do histórico
- `app/throughput.tsx` — calculadora de Throughput
- `app/link-budget.tsx` — calculadora de Link Budget
- `app/history.tsx` — histórico (FlatList, GET + DELETE, pull-to-refresh)
- `app/save-calculation.tsx` — formulário validado (POST)
- `components/ui.tsx` — primitivos de UI reutilizáveis
- `components/CalculationCard.tsx` — item da lista de histórico
- `lib/calc.ts` — toda a lógica de cálculo + tabelas N_RB do 3GPP

## Tecnologias

- Expo (SDK 54), React Native 0.81, expo-router, TypeScript 5.9
- Node.js + Express, Zod, Pino (backend)
- TanStack React Query + cliente gerado por Orval (integração)
