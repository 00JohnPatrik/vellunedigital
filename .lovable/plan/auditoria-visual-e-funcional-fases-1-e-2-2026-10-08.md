# Auditoria visual e funcional — Fases 1 e 2

## Objetivo
Avaliar a versão atual em execução, sem editar arquivos, alterar dados, publicar ou corrigir problemas. A auditoria combinará testes reais no navegador com inspeção somente de leitura dos fluxos que não podem ser acionados sem modificar conteúdo.

## 1. Preparação e evidências
- Confirmar que a versão atual compila e registrar erros relevantes já presentes no navegador, rede e execução.
- Entrar com uma conta existente e localizar convites, clientes e modelos reais já disponíveis; não criar dados de teste.
- Escolher um convite editável e um convite público existente. Nenhuma ação de salvar, publicar, excluir, favoritar ou concluir onboarding será executada se puder persistir mudanças.
- Capturar evidências visuais nos tamanhos pedidos, sempre a partir de uma sessão nova do navegador.

## 2. Editor Pro
Testar a rota real do editor em:
- Desktop largo: 1440 × 900
- Notebook: 1280 × 800
- Tablet: 768 × 1024
- Mobile: 390 × 844
- Mobile compacto: 360 × 800

Em cada tamanho:
- Avaliar topo, navegação por tarefas, canvas, propriedades, camadas, zoom, leitura visual, áreas clicáveis, rolagem, cortes e sobreposições.
- Selecionar elementos existentes e confirmar visualmente a presença, posição e estabilidade da barra de ações rápidas.
- Conferir seleção simples, múltipla, elementos bloqueados e interação por toque sem persistir alterações.
- Inspecionar no código a ligação e as regras de: editar texto, duplicar, centralizar, frente/trás, girar, agrupar/desagrupar, copiar/colar estilo, bloquear/desbloquear e excluir. Ações que alteram o convite serão avaliadas pelo fluxo dos handlers, não executadas.
- Comparar a experiência observada com o plano do editor desktop e classificar se já transmite uma experiência “Editor Pro”.

## 3. Convite público
Abrir um convite publicado real em desktop e mobile e verificar:
- Aparência premium, hierarquia, tipografia, contraste, espaçamento, ambientação e desempenho percebido.
- Ações de copiar link, compartilhar, WhatsApp e “Adicionar à agenda”, sem concluir ações externas.
- RSVP, estados visíveis, rolagem, overflow e comportamento dos blocos e efeitos.
- Construção da URL de agenda para data, hora e local, incluindo casos ausentes ou inválidos por inspeção do fluxo e dos dados usados.
- Console, falhas de rede, erros de renderização e carregamento de mídia.

## 4. Fase 2
Validar em desktop, tablet e mobile:
- **Clientes:** listagem, busca e filtros não persistentes, cards/resumos, detalhe, timeline, vazio, loading e erro observável.
- **Relatórios:** cards, gráficos/tabelas, filtros não persistentes, dados vazios, loading, erro e adaptação de largura.
- **Modelos:** busca, filtros, ordenação A–Z/Recentes, apresentação dos favoritos existentes e responsividade; não alterar favoritos.
- **Onboarding:** aparência, responsividade, destinos dos links por inspeção segura e fechamento pelo código; não persistir o fechamento.

## 5. Critério comercial
Comparar todas as telas com a proposta Vellune: premium, moderna, simples para o cliente final e sem aparência de protótipo. Separar problemas puramente visuais de falhas funcionais ou riscos técnicos.

## Entrega
- Matriz por tela e tamanho: Desktop / Tablet / Mobile, com **OK / ATENÇÃO / CRÍTICO**.
- Evidências reais do navegador e indicação explícita do que foi apenas inspecionado no código ou não pôde ser validado.
- Problemas visuais separados dos funcionais, com rota, tamanho, reprodução e arquivo/componente responsável quando confirmado.
- Lista priorizada **P0 / P1 / P2**.
- Conclusão objetiva: Fases 1 e 2 prontas ou não para seguir à Fase 3.
- Nenhuma alteração no projeto, nos arquivos ou nos dados.