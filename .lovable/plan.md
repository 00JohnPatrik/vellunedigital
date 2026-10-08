# Auditoria do editor desktop: estado atual e próximos ajustes

Auditoria somente de leitura. Nenhum arquivo foi alterado e nada foi publicado. O que foi verificado: os tipos compilam sem erros (o verificador terminou sem mensagens), há leitura do código e o editor foi aberto com a conta Super Admin em 1440x900 (convite "SSSS", 3 elementos).

## 1. O que do plano já está implementado
- Barra de tarefas com Modelos, Texto, Fotos, Elementos, Fundo e Mais, além de um cartão "Comece sem complicação".
- Biblioteca de elementos com busca, categorias, cartões com prévia, inserção por clique e por arraste até o canvas.
- Galeria de modelos ligada ao editor, com confirmação antes de substituir o conteúdo.
- Barra flutuante de ações rápidas (fonte, tamanho, negrito, itálico, cor, alinhamento, duplicar, bloquear, excluir, camadas e "Mais ajustes"), com Trocar, Recortar e Ajustar para fotos.
- Edição de texto direto na arte, por uma caixa de texto sobre o elemento.
- Encaixe automático em bordas e centros, sem precisar de Shift. O Shift fica só para encaixe na grade e para girar em passos de 15°.
- Painel de Ajustes completo reaproveitado à direita.
- Topo do convite com Voltar, nome, status, link, indicador "Salvo", Visualizar, Salvar, Publicar e Mais (Dados do evento, RSVP, Convidados, Check-in).
- Salvamento: autosave com espera, sem dois salvamentos ao mesmo tempo, validação antes de gravar e aviso ao sair com alterações não salvas. Histórico de desfazer/refazer preservado.

## 2. BLOQUEADORES (impedem considerar o editor pronto)
1. **A navegação do painel administrativo continua visível.** Na tela, a barra lateral (Dashboard, Empresas…) e a busca do topo aparecem junto do editor. O plano exige uma área de criação dedicada. Isso tira cerca de 256px de largura e 72px de altura.
2. **O canvas só começa em ~385px de altura em 1440x900.** Há três faixas empilhadas antes dele: o topo do painel, o topo do convite em duas linhas e a faixa "Editor visual" com dispositivo e zoom. A página rola (1123px de altura) e quase metade do convite fica abaixo da tela.
3. **Existem dois sistemas de arrastar no mesmo canvas.** O editor ainda tem o seu próprio código antigo de arrastar, redimensionar e selecionar por área, ligado ao mesmo canvas onde o VisualTransformCanvas já faz isso. Há risco de movimentos duplicados ou que se anulam, e de duas entradas no histórico por gesto. É preciso confirmar em teste e manter só o VisualTransformCanvas.

## 3. AJUSTES NECESSÁRIOS
- O painel de Ajustes (300px) fica sempre aberto, mesmo sem nada selecionado. O plano pede que ele apareça sob demanda (pelo "Mais ajustes" ou com um elemento selecionado).
- O controle de zoom aparece em dois lugares, na faixa superior e acima do canvas. Basta um.
- Os botões Salvar e Publicar aparecem duas vezes no código do topo (versão desktop e linha compacta). Vale conferir que a linha compacta só aparece no celular.
- O ponto de partida do canvas é "Tablet", e o convite aparece com uma moldura tracejada. Em desktop, o melhor é abrir em "Desktop" ou "Ajustar à tela".
- O texto "Toque em um elemento" deveria dizer "Clique em um elemento" no desktop.
- Há um aviso de diferença entre a versão do servidor e a do navegador (problema conhecido do tema escuro). Não quebra nada.
- Celular: continuam existindo a linha compacta do topo e a barra inferior do editor. Isso deve ser preservado agora e revisto no Prompt 3.
- Ainda não testado na prática: edição de texto na arte, guias de encaixe, colar com Ctrl+V, troca de modelo e se o salvamento persiste depois de recarregar.

## 4. JÁ OK
Compilação e tipos sem erros; nenhum arquivo do editor desativa a verificação de tipos; validação do conteúdo; autosave e salvamento manual; prévia via sessão; publicação e compartilhamento; acesso a RSVP, Convidados e Check-in; um único bloco de RSVP (também ao colar); biblioteca; galeria; barra rápida; logo preservada.

## Plano de correção (sem reescrita)
1. Abrir o editor de convite em tela cheia, sem a barra lateral e o topo do painel, mantendo o "Voltar".
2. Juntar o topo do convite e a faixa de ferramentas em uma única linha compacta, para o canvas aparecer inteiro em 1440x900.
3. Retirar do editor o código antigo de arrastar e de seleção por área e manter só o VisualTransformCanvas.
4. Abrir o painel de Ajustes só quando necessário, deixar um único zoom e abrir em "Ajustar".
5. Validar: compilação; teste no navegador em 1440x900 (editar texto, arrastar com guias, inserir por arraste, trocar foto, aplicar modelo, desfazer/refazer, salvar, recarregar e restaurar); conferir o celular sem mudanças.

## Detalhes técnicos
- Navegação: o AppShell envolve `/invitations/$id/editor` por meio da rota `invitations.tsx`. É preciso excluir a rota do editor, ou dar a ela um layout próprio, sem mudar a autenticação.
- Código duplicado: `startDrag`, `startResize`, `moveInteraction`, `stopInteraction` e o modo marquee em `visual-editor.tsx` (perto das linhas 500–605 e 907–941).
- Zoom duplicado em `visual-editor.tsx` (linhas ~720 e ~904).
- Nenhuma mudança no banco, na segurança, na publicação ou no editor experimental.
