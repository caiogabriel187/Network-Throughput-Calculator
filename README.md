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
