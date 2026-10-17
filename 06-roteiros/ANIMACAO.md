# Roteiro da animação

Referência: vídeo de animal acompanhando tigela. Adaptação aprovada para o modelo 03: beagle curioso acompanha petisco, reage com piscadela e revela a nota.

0-1,2s: petisco entra pela direita, próximo da direção do olhar. Nada passa por cima da headline ou CTAs.
1,2-2,4s: arco curto e inclinação sutil do conjunto do cachorro, sem deformar cabeça, focinho e patas.
2,4-3,2s: duas poses quase idênticas fazem crossfade para a piscadela. Nota aparece com fade e leve rotação.
3,2-4,4s: petisco pousa à direita; a composição se estabiliza. Não repetir automaticamente.

O estudo usa camadas 2D; o olhar do beagle está desenhado na pose, sem rastreamento ocular contínuo. Um filme com olhos acompanhando trajetórias livres exigiria produção adicional; não confundir isso com o protótipo fornecido.

Controles: Repetir animación, Pausar animación, Continuar animación. Respeitar prefers-reduced-motion com foto estática. Sem áudio, sem scroll travado, sem autoplay infinito.

Scroll: papéis entram com 14px de deslocamento e fade, apenas quando o navegador permite animação. Interação continua utilizável sem JS. Se qualquer camada falhar, manter o hero estático.
