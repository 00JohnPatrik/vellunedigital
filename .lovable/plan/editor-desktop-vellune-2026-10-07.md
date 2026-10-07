# Editor desktop Vellune

## Resultado
- Uma área de criação dedicada, sem navegação administrativa concorrente, com topo compacto: voltar, nome, histórico, salvar, visualizar e publicar.
- Barra de tarefas única: Modelos, Texto, Fotos, Elementos, Fundo e Mais. Bibliotecas visuais com busca, inserção por clique e arraste.
- Convite em destaque; edição de texto diretamente na arte e ferramentas flutuantes simples. Fotos com Trocar, Recortar, Ajustar e Mais.
- Propriedades completas preservadas em ajustes recolhíveis, abertas sob demanda; camadas e recursos do evento acessíveis em Mais.
- Snap automático para centros, bordas e outros elementos, com guias claras e Shift opcional.
- Galeria de modelos funcional com miniaturas corrigidas e confirmação de substituição.

## Preservação
Manter conteúdo, todos os blocos, renderização compartilhada, histórico, autosave, salvamento, preview, publicação, RSVP, convidados e check-in. Não alterar banco, segurança, logo ou editor experimental. Manter os controles mobile atuais sem redesenho específico.

## Detalhes técnicos
Refatorar o VisualEditor existente e remover somente seus retornos inacessíveis e código comentado não utilizado. Reutilizar VisualTransformCanvas, ElementsLibrary, TemplateGallery, ImagePropertiesPanel e ContextualPropertiesPanel. Toda alteração de bloco continua passando por useBlocksHistory e pelo fluxo atual de validação/persistência. A rota conserva os mesmos handlers de salvar/publicar/preview; apenas reorganiza a apresentação desktop.

## Validação
Conferir diagnósticos automáticos de compilação e tipos; testar no navegador desktop e conferir mobile. Quando houver sessão disponível, editar um convite real, salvar, conferir a prévia e recarregar para verificar persistência, restaurando as mudanças de teste. Não publicar um convite real durante o teste. O histórico do projeto é gerenciado automaticamente pela plataforma, sem comandos de commit manual.