# Integração

Copiar 08-estudo e os diretórios de assets mantendo caminhos relativos. Não há build, dependência de CDN, API ou credenciais. Textos ficam no HTML; o título tem arte SVG e texto acessível dentro do h1. JSON fornece referência editorial. Alterar os dados exige atualizar HTML e JSON juntos.

Logo: usar SVG, preservar viewBox 0 0 256 299, largura auto e espaço de respiro. Não achatar sobre fundo branco. Usar PNG como fallback.

Motion: só habilitar camadas depois de cenário e três PNG carregarem. Foto estática permanece no DOM como fallback. A camada de piscadela parte de opacity 0 e entra sobre a pose aberta, que permanece opaca para impedir transparência do corpo durante a transição. CSS mantém posições iguais.

Agendamento é link externo para WhatsApp conforme captura. O número exibido deriva do anúncio fornecido. Não informar confirmação de reserva ou disponibilidade automática. Confirmar horários, número e permissões de imagem antes de publicar.

Testar 390px, 768px, 1440px, Safari, Firefox e Chrome; teclado, zoom 200%, reduced motion e falha de imagem. A renderização em navegador real permanece como revisão de publicação.
