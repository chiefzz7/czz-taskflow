# TASKFLOW — FULL-STACK TASK MANAGEMENT PLATFORM

Quero que você atue como um **Senior Software Architect, Senior Full-Stack Engineer, UI/UX Engineer, Database Designer e Tech Lead** responsável por projetar e implementar do zero um sistema web chamado **TaskFlow**.

O TaskFlow será uma plataforma moderna de gerenciamento de tarefas, produtividade pessoal e colaboração empresarial.

Seu objetivo não é criar apenas um protótipo ou uma interface visual.

Quero construir uma aplicação **real, funcional, escalável, bem estruturada, segura, responsiva e preparada para produção**.

---

# 1. VISÃO DO PRODUTO

O **TaskFlow** terá dois ambientes principais:

1. **Modo Pessoal**
2. **Modo Enterprise**

Todo usuário terá acesso ao seu ambiente pessoal e poderá também participar de um ambiente Enterprise.

A interface deverá permitir alternar facilmente entre:

* Pessoal
* Enterprise

A troca de contexto deve ser intuitiva e claramente indicada na interface.

---

# 2. OBJETIVO DO SISTEMA

O TaskFlow deverá permitir que usuários organizem:

* tarefas pessoais;
* tarefas profissionais;
* responsabilidades;
* prioridades;
* prazos;
* lembretes;
* tarefas recorrentes;
* equipes;
* colaboradores;
* dashboards;
* relatórios;
* comunicação empresarial em tempo real.

O sistema deverá transmitir a sensação de uma aplicação SaaS moderna e profissional.

Use como inspiração apenas conceitos de experiência e organização encontrados em ferramentas como:

* Linear;
* Notion;
* ClickUp;
* Asana;
* Trello;
* Monday;
* Slack.

Não copie diretamente nenhum desses sistemas.

Crie uma identidade própria para o **TaskFlow**.

---

# 3. STACK OBRIGATÓRIA

## Backend

Utilize:

* Python
* FastAPI
* uv
* SQLModel
* Pydantic
* bcrypt para hash seguro de senhas
* JWT para autenticação
* WebSockets para comunicação em tempo real
* pytest para testes

Estruture o backend pensando inicialmente em execução local, mas preparado para posteriormente utilizar:

* Render para hospedagem do backend;
* PostgreSQL / Supabase como banco de dados.

---

# 4. FRONTEND

Utilize:

* React
* Vite
* JavaScript ou TypeScript, preferencialmente TypeScript
* React Router
* Axios
* Tailwind CSS
* Lucide React para ícones

Se alguma biblioteca complementar for realmente necessária, explique rapidamente o motivo antes de adicioná-la.

---

# 5. REGRA ABSOLUTA DE ESTILIZAÇÃO

TODOS OS ESTILOS DEVEM SER FEITOS COM TAILWIND CSS.

Não utilize:

* CSS tradicional;
* arquivos `.css` personalizados;
* styled-components;
* Emotion;
* CSS Modules;
* estilos inline.

A única exceção aceitável é o arquivo base exigido pelo Tailwind contendo suas diretivas/configurações.

Toda estilização da aplicação deverá utilizar classes Tailwind.

---

# 6. DESIGN SYSTEM

Quero um design extremamente profissional.

A aplicação deverá parecer um verdadeiro produto SaaS moderno.

Características desejadas:

* visual clean;
* moderno;
* minimalista;
* sofisticado;
* profissional;
* excelente hierarquia visual;
* uso inteligente de whitespace;
* cards bem estruturados;
* sombras discretas;
* bordas suaves;
* animações sutis;
* excelente legibilidade;
* consistência visual.

Evite interfaces excessivamente coloridas ou infantis.

---

# 7. LIGHT MODE E DARK MODE

O sistema deverá possuir obrigatoriamente:

* modo claro;
* modo escuro;
* opção para seguir configuração do sistema operacional.

A preferência deverá ser persistida localmente.

O Dark Mode deve ser desenvolvido cuidadosamente.

Não quero apenas inverter cores.

Crie uma paleta apropriada para cada modo.

Garanta contraste adequado entre:

* background;
* sidebar;
* cards;
* textos;
* inputs;
* dropdowns;
* modais;
* tabelas;
* badges;
* botões;
* gráficos.

---

# 8. RESPONSIVIDADE

A aplicação deverá ser extremamente responsiva.

Considere principalmente:

* desktop;
* notebook;
* tablet;
* smartphone.

Utilize abordagem **mobile-first**.

O sistema deve ser totalmente utilizável no celular.

No mobile:

* sidebar deverá virar drawer/menu;
* tabelas devem adaptar sua visualização;
* cards deverão reorganizar corretamente;
* modais precisam respeitar a tela;
* formulários devem ocupar largura apropriada;
* botões precisam ter áreas de toque confortáveis;
* dashboards devem reorganizar os gráficos;
* chat deve funcionar perfeitamente;
* Kanban precisa ter experiência mobile utilizável.

Evite qualquer overflow horizontal desnecessário.

---

# 9. AUTENTICAÇÃO

Implementar sistema de autenticação com:

* cadastro;
* login;
* logout;
* JWT Access Token;
* proteção das rotas;
* hash de senha com bcrypt.

Inicialmente, durante o desenvolvimento local, usuários podem ser armazenados em memória ou através de um repositório temporário.

Entretanto, a arquitetura DEVE utilizar abstrações que permitam substituir facilmente essa implementação por banco SQL posteriormente.

Nunca acople as regras de negócio diretamente ao armazenamento em memória.

Crie uma camada de repository/service.

---

# 10. USUÁRIOS

Cada usuário deverá possuir pelo menos:

* id;
* nome;
* email;
* senha com hash;
* avatar opcional;
* data de criação;
* status;
* preferências;
* tema;
* timezone.

No Enterprise, poderão existir cargos como:

* Admin;
* Manager;
* Member.

Prepare o sistema para RBAC — Role Based Access Control.

---

# 11. MODO PESSOAL

No ambiente pessoal, cada usuário poderá:

* criar tarefas;
* editar tarefas;
* excluir tarefas;
* concluir tarefas;
* arquivar tarefas;
* adicionar lembretes;
* alterar prioridades;
* adicionar datas;
* adicionar descrições;
* tornar tarefas recorrentes;
* organizar tarefas por status;
* pesquisar tarefas;
* filtrar tarefas;
* ordenar tarefas.

---

# 12. STATUS DAS TAREFAS

Utilize inicialmente os seguintes status:

* Backlog
* To Do
* In Progress
* Review
* Done
* Archived

Estruture de maneira que novos status possam ser adicionados futuramente.

Na interface, disponibilize também visualização em formato Kanban.

As tarefas devem poder ser movimentadas entre os status.

Se possível, implementar Drag & Drop de maneira organizada e acessível.

---

# 13. PRIORIDADE

Cada tarefa deverá possuir prioridade:

* None
* Low
* Medium
* High
* Urgent

Utilize badges visuais discretos para representar cada prioridade.

Não dependa apenas de cores; utilize também texto e/ou ícones.

---

# 14. ESTRUTURA DAS TAREFAS

Uma tarefa deverá possuir no mínimo:

* id;
* título;
* descrição;
* status;
* prioridade;
* criador;
* responsável principal;
* responsáveis;
* usuários que podem visualizar;
* data de criação;
* data de atualização;
* data prevista de início;
* data real de início;
* prazo;
* data de conclusão;
* recorrência;
* observações;
* origem da tarefa;
* personal ou enterprise;
* enterprise_id quando aplicável.

O modelo deve ser preparado para aceitar futuramente:

* tags;
* anexos;
* subtarefas;
* comentários;
* dependências;
* histórico;
* checklist.

---

# 15. TAREFAS RECORRENTES

Implementar suporte conceitual e estrutural para:

* diária;
* semanal;
* mensal;
* anual.

Também preparar a arquitetura para posteriormente aceitar:

* dias específicos da semana;
* intervalo personalizado;
* recorrência a cada X dias;
* recorrência até determinada data;
* quantidade máxima de repetições.

Crie um modelo de recorrência limpo e extensível.

Não espalhe regras de recorrência diretamente pelo código.

Crie serviço específico.

---

# 16. LEMBRETES

Uma tarefa poderá possuir lembretes.

Exemplos:

* 10 minutos antes;
* 30 minutos antes;
* 1 hora antes;
* 1 dia antes;
* horário personalizado.

Inicialmente os lembretes podem funcionar dentro da aplicação.

Estruture o código para posteriormente suportar:

* email;
* push notification;
* notificações externas.

---

# 17. MODO ENTERPRISE

O ambiente Enterprise possuirá todas as funcionalidades do ambiente pessoal, além das funcionalidades colaborativas.

Cada Enterprise deverá possuir:

* id;
* nome;
* descrição;
* logo;
* proprietário;
* membros;
* cargos;
* data de criação;
* configurações.

---

# 18. PERMISSÕES ENTERPRISE

Admins poderão:

* criar tarefas;
* editar tarefas;
* excluir tarefas;
* atribuir responsáveis;
* determinar quais usuários podem visualizar uma tarefa;
* alterar status;
* definir prioridades;
* gerenciar membros;
* visualizar dashboards;
* visualizar relatórios;
* administrar informações da organização.

Managers poderão ter permissões intermediárias.

Members visualizarão e manipularão conteúdos conforme suas permissões.

Nunca confie apenas no frontend para controle de autorização.

Toda autorização crítica deverá ser validada no backend.

---

# 19. VISIBILIDADE DAS TAREFAS

Uma tarefa Enterprise poderá possuir:

* criador;
* responsável principal;
* múltiplos responsáveis;
* lista de usuários autorizados a visualizar;
* opcionalmente visibilidade geral dentro da organização.

O backend deverá validar todas essas permissões.

Um usuário não autorizado nunca deverá receber os dados daquela tarefa pela API.

---

# 20. CHAT EM TEMPO REAL

O ambiente Enterprise deverá possuir chat em tempo real.

Use WebSockets no FastAPI.

Suporte inicialmente:

* mensagens de texto;
* imagens;
* mensagens de voz.

Cada mensagem deverá possuir:

* id;
* autor;
* conteúdo;
* tipo;
* timestamp;
* status;
* referência ao Enterprise;
* referência ao canal ou conversa.

Tipos iniciais:

* text;
* image;
* audio.

---

# 21. CHAT — EXPERIÊNCIA

Criar interface similar ao conceito de aplicações modernas de comunicação.

Deve possuir:

* lista de conversas;
* área de mensagens;
* avatar;
* nome;
* horário;
* campo de mensagem;
* botão de anexar imagem;
* botão para áudio;
* indicador visual de envio.

No mobile, a navegação entre lista de conversas e chat deverá ser totalmente adaptada.

---

# 22. UPLOADS

Inicialmente, durante o ambiente localhost, imagens e áudios poderão ser tratados através de armazenamento local.

Porém crie uma camada de abstração para armazenamento.

Posteriormente o sistema poderá utilizar:

* Supabase Storage.

Nunca espalhe caminhos locais diretamente pelas regras de negócio.

---

# 23. DASHBOARD

Criar Dashboard pessoal e Dashboard Enterprise.

O Dashboard deve apresentar informações realmente úteis.

Exemplos:

* total de tarefas;
* tarefas abertas;
* tarefas concluídas;
* tarefas atrasadas;
* tarefas em andamento;
* tarefas por prioridade;
* tarefas por status;
* tarefas concluídas recentemente;
* tarefas próximas do prazo;
* percentual de conclusão.

No Enterprise também adicionar:

* tarefas por colaborador;
* tarefas concluídas por período;
* distribuição de tarefas;
* tarefas atrasadas por colaborador;
* atividade recente.

---

# 24. RELATÓRIOS

Criar página de relatórios com:

* filtros por período;
* filtro por usuário;
* filtro por status;
* filtro por prioridade;
* filtro por organização.

Exibir:

* tarefas criadas;
* tarefas concluídas;
* tarefas atrasadas;
* taxa de conclusão;
* produtividade por período;
* distribuição por status;
* distribuição por prioridade.

Utilize gráficos claros e responsivos.

---

# 25. PÁGINAS DO SISTEMA

Criar pelo menos:

## Públicas

* Login
* Cadastro

## Aplicação

* Dashboard
* Minhas Tarefas
* Kanban
* Calendário
* Relatórios
* Enterprise
* Chat
* Membros
* Configurações
* Perfil

---

# 26. LAYOUT PRINCIPAL

Desktop:

* sidebar lateral;
* header superior;
* conteúdo principal.

Sidebar:

* logo TaskFlow;
* seletor Personal / Enterprise;
* Dashboard;
* Tarefas;
* Kanban;
* Calendário;
* Relatórios;
* Chat;
* Enterprise;
* Configurações;
* usuário logado.

Mobile:

* topbar compacta;
* menu drawer;
* navegação otimizada;
* conteúdo utilizando praticamente toda largura disponível.

---

# 27. COMPONENTES REUTILIZÁVEIS

Crie componentes reutilizáveis para:

* Button
* Input
* Textarea
* Select
* Modal
* Drawer
* Dropdown
* Badge
* Avatar
* Card
* Tooltip
* Tabs
* Alert
* Toast
* Skeleton
* EmptyState
* Pagination
* SearchInput
* DataTable
* DatePicker
* TaskCard
* TaskModal
* PriorityBadge
* StatusBadge
* UserSelector

Evite duplicação de código.

---

# 28. UX

Implemente estados para:

* loading;
* erro;
* lista vazia;
* sem resultados de pesquisa;
* erro de servidor;
* requisição sem autorização;
* sessão expirada.

Use:

* skeleton loading;
* toast;
* confirmação para ações destrutivas;
* feedback visual;
* estados disabled;
* mensagens de validação claras.

---

# 29. BACKEND — ARQUITETURA

Quero estrutura organizada.

Sugestão:

backend/

app/
main.py

```
api/
    routes/

core/
    config.py
    security.py

models/

schemas/

repositories/

services/

dependencies/

websocket/

utils/
```

tests/

pyproject.toml

Não concentre toda aplicação em poucos arquivos gigantes.

---

# 30. FRONTEND — ARQUITETURA

Sugestão:

frontend/

src/
assets/
components/
layouts/
pages/
hooks/
contexts/
services/
types/
utils/
routes/
features/
auth/
tasks/
dashboard/
enterprise/
chat/
reports/

```
App.tsx
main.tsx
```

Organize preferencialmente por feature conforme o projeto crescer.

---

# 31. API

Utilize padrão REST organizado.

Exemplo:

/api/v1/auth

/api/v1/users

/api/v1/tasks

/api/v1/enterprises

/api/v1/enterprises/{enterprise_id}/members

/api/v1/enterprises/{enterprise_id}/tasks

/api/v1/reports

/api/v1/dashboard

WebSockets:

/ws/enterprises/{enterprise_id}/chat

Utilize `/api/v1` desde o início.

---

# 32. SEGURANÇA

Implementar boas práticas.

Obrigatório:

* senha nunca armazenada em texto puro;
* bcrypt;
* JWT;
* validação Pydantic;
* autorização no backend;
* sanitização apropriada;
* tratamento centralizado de erros;
* CORS configurável;
* secrets via environment variables;
* nenhuma senha/token hardcoded.

Criar `.env.example`.

---

# 33. BANCO DE DADOS FUTURO

Mesmo que inicialmente o desenvolvimento utilize armazenamento temporário/local, modele as entidades pensando em PostgreSQL.

O banco final será Supabase/PostgreSQL.

Utilize SQLModel de maneira compatível.

Prepare migrations para posteriormente usar Alembic.

Principais entidades previstas:

* User
* Enterprise
* EnterpriseMember
* Task
* TaskAssignee
* TaskViewer
* Reminder
* Recurrence
* Chat
* ChatMember
* Message
* Attachment

---

# 34. IDs

Utilize UUIDs para entidades importantes.

Evite depender de IDs sequenciais expostos publicamente.

---

# 35. DATAS

Todas as datas armazenadas pelo backend devem utilizar padrão consistente.

Preferencialmente UTC.

Frontend deve apresentar horários de acordo com timezone do usuário.

---

# 36. TYPESCRIPT

No frontend prefira TypeScript.

Não abuse de `any`.

Crie interfaces/types para:

* User;
* Task;
* Enterprise;
* Message;
* Dashboard;
* Reports;
* API responses.

---

# 37. AXIOS

Criar cliente centralizado.

Exemplo conceitual:

services/api.ts

Adicionar:

* baseURL;
* interceptors;
* JWT;
* tratamento de 401;
* tratamento padronizado de erros.

Não faça configuração Axios repetida em componentes.

---

# 38. ESTADO

Evite complexidade desnecessária.

Para estado global simples, utilize Context API.

Caso a aplicação realmente necessite de gerenciamento mais avançado, você poderá recomendar uma solução.

Não adicione Redux apenas por padrão.

---

# 39. QUALIDADE DE CÓDIGO

Obrigatório:

* nomes claros;
* funções pequenas;
* separação de responsabilidades;
* evitar duplicação;
* tratamento adequado de erros;
* tipagem consistente;
* comentários somente quando realmente necessários;
* evitar abstrações prematuras.

---

# 40. TESTES

Backend deverá possuir testes para partes críticas:

* autenticação;
* criação de tarefas;
* permissões;
* alteração de tarefas;
* Enterprise;
* acesso não autorizado.

Estruture testes com pytest.

---

# 41. DADOS DE DESENVOLVIMENTO

Como inicialmente trabalharemos localmente, crie usuários de desenvolvimento.

Exemplo:

Admin:
[admin@taskflow.local](mailto:admin@taskflow.local)

Manager:
[manager@taskflow.local](mailto:manager@taskflow.local)

Member:
[member@taskflow.local](mailto:member@taskflow.local)

Personal:
[user@taskflow.local](mailto:user@taskflow.local)

Utilize senhas claramente indicadas apenas como dados de desenvolvimento.

Nunca trate essas credenciais como produção.

Crie também:

* algumas tarefas;
* uma empresa de exemplo;
* mensagens;
* colaboradores;
* dados de dashboard.

Isso permitirá visualizar todas as páginas durante o desenvolvimento.

---

# 42. DEPLOY FUTURO

Prepare o projeto desde o início pensando em:

Frontend:

Vercel

Backend:

Render

Database:

Supabase PostgreSQL

Files:

Supabase Storage

Por enquanto, entretanto:

TODO DEVE FUNCIONAR LOCALHOST.

---

# 43. VARIÁVEIS DE AMBIENTE

Backend:

DATABASE_URL
JWT_SECRET_KEY
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
CORS_ORIGINS
STORAGE_PROVIDER

Frontend:

VITE_API_URL
VITE_WS_URL

Criar `.env.example` para cada aplicação.

---

# 44. DOCUMENTAÇÃO

Criar README profissional explicando:

* objetivo;
* funcionalidades;
* arquitetura;
* stack;
* requisitos;
* instalação;
* execução do frontend;
* execução do backend;
* usuários de desenvolvimento;
* variáveis de ambiente;
* estrutura de diretórios.

---

# 45. GIT

Criar `.gitignore` adequado.

Nunca versionar:

* `.env`;
* `.venv`;
* node_modules;
* arquivos temporários;
* uploads locais;
* secrets.

---

# 46. EXECUÇÃO LOCAL

Backend deve funcionar preferencialmente com:

uv sync

uv run fastapi dev app/main.py

Frontend:

npm install

npm run dev

Documente corretamente os comandos reais utilizados.

---

# 47. REGRA DE IMPLEMENTAÇÃO

NÃO tente implementar o projeto inteiro de maneira desorganizada em uma única etapa.

Antes de desenvolver:

1. analise os requisitos;
2. defina arquitetura;
3. modele entidades;
4. planeje backend;
5. planeje frontend;
6. defina autenticação;
7. defina RBAC;
8. defina fluxo Personal/Enterprise;
9. defina WebSocket;
10. defina estrutura de pastas.

Depois implemente incrementalmente.

---

# 48. ORDEM RECOMENDADA

## FASE 1 — FOUNDATION

* monorepo;
* backend FastAPI;
* frontend React;
* Tailwind;
* estrutura;
* configuração;
* Dark/Light mode.

## FASE 2 — AUTH

* User;
* login;
* cadastro;
* JWT;
* rotas protegidas;
* usuário logado.

## FASE 3 — PERSONAL

* CRUD de tarefas;
* status;
* prioridades;
* datas;
* filtros;
* pesquisa;
* recorrência.

## FASE 4 — DASHBOARD

* métricas;
* cards;
* gráficos;
* tarefas recentes.

## FASE 5 — ENTERPRISE

* organização;
* membros;
* roles;
* permissões;
* tarefas compartilhadas.

## FASE 6 — CHAT

* WebSockets;
* mensagens;
* imagens;
* áudio.

## FASE 7 — REPORTS

* métricas;
* filtros;
* gráficos.

## FASE 8 — POLISH

* responsividade;
* acessibilidade;
* loading;
* skeleton;
* empty states;
* animações;
* UX.

## FASE 9 — PRODUCTION READY

* PostgreSQL;
* Supabase;
* migrations;
* Render;
* Vercel.

---

# 49. IMPORTANTE SOBRE ALTERAÇÕES

Antes de alterar código existente:

* leia o arquivo;
* entenda as dependências;
* identifique onde a funcionalidade pertence;
* preserve funcionalidades existentes.

Nunca sobrescreva arquivos grandes sem necessidade.

Não remova funcionalidade funcional sem motivo.

---

# 50. NÃO FAÇA

Não:

* crie código fictício dizendo que funciona;
* deixe imports quebrados;
* crie componentes sem usá-los;
* faça chamadas para endpoints inexistentes;
* esconda erros;
* use mocks onde deveria existir integração real sem avisar;
* use CSS fora do Tailwind;
* armazene passwords em texto puro;
* valide autorização apenas no frontend;
* coloque toda regra de negócio nos endpoints;
* crie arquivos gigantes sem separação de responsabilidade.

---

# 51. QUANDO HOUVER DÚVIDA

Se uma decisão não estiver explicitamente definida:

1. escolha a solução mais simples;
2. escolha a solução mais sustentável;
3. mantenha consistência com a arquitetura;
4. documente rapidamente a decisão.

Não interrompa constantemente o desenvolvimento para perguntas pequenas.

Tome decisões técnicas razoáveis como um desenvolvedor sênior.

---

# 52. OBJETIVO VISUAL

Quero abrir o TaskFlow e ter imediatamente a sensação de:

"Isso parece um produto SaaS profissional pronto para ser lançado."

Priorize:

* consistência;
* simplicidade;
* excelente UX;
* velocidade;
* organização;
* responsividade.

Não quero aparência de projeto escolar ou dashboard genérico.

---

# 53. PRIMEIRA ENTREGA

ANTES DE ESCREVER CÓDIGO, apresente:

1. resumo do entendimento do sistema;
2. arquitetura proposta;
3. estrutura completa de diretórios;
4. entidades e relacionamentos;
5. endpoints principais;
6. estratégia de autenticação;
7. estratégia de autorização/RBAC;
8. arquitetura do chat/WebSocket;
9. estratégia de recorrência;
10. fluxo Personal vs Enterprise;
11. design system;
12. plano de desenvolvimento por fases.

Depois disso, comece a implementação da FASE 1.

Não pare apenas no planejamento.

Após apresentar o plano, inicie efetivamente a criação do projeto.

---

# 54. CRITÉRIO FINAL

Considere uma implementação concluída somente quando:

* frontend compilar;
* backend iniciar;
* imports estiverem válidos;
* rotas principais funcionarem;
* autenticação funcionar;
* aplicação estiver responsiva;
* Dark Mode funcionar;
* Light Mode funcionar;
* não existirem erros óbvios no console;
* README estiver atualizado.

Ao final de cada fase:

* revise o que foi criado;
* procure erros;
* execute testes disponíveis;
* corrija problemas encontrados;
* explique resumidamente o que foi implementado.

Agora comece pelo entendimento do projeto e arquitetura, depois avance para a implementação.
