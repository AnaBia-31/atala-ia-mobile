# Atala.IA — App mobile

Versão para celular (Android e iOS) da extensão do Chrome Atala.IA (repositório `atala-ia`).
Feita com **React Native + Expo** (SDK 58), em JavaScript, reaproveitando a lógica da extensão.

## Rodar no celular

1. Instale o app **Expo Go** no celular (Play Store / App Store).
2. Na pasta do projeto, instale as dependências e inicie o servidor:

```bash
npm install
```

```bash
npx expo start
```

> Na escola (Windows/PowerShell), use `npx.cmd` no lugar de `npx` e libere os scripts antes:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

3. Leia o QR code com a câmera (iPhone) ou pelo Expo Go (Android). O celular e o PC precisam estar
   na mesma rede Wi-Fi. Se a rede bloquear, rode `npx expo start --tunnel`.

### Celular ligado no PC pelo cabo USB (recomendado na escola)

Na escola o PC fica na rede cabeada e o celular no Wi-Fi, que é outra rede: o celular não consegue
falar com o PC e o Expo Go mostra **"Something went wrong"**. Com o celular no cabo USB (com a
**Depuração USB** ligada nas Opções do desenvolvedor), rode o servidor em modo `--localhost`:

```bash
npx.cmd expo start --localhost
```

e tecle **a**. O Expo cria o túnel pelo cabo (`adb reverse`) e abre `exp://127.0.0.1:8081` no
Expo Go, sem depender do Wi-Fi. Atalho que já abre direto no celular: `npm.cmd run usb`.

Depois de mudar algum arquivo, o app atualiza sozinho no celular.

## Como usar

No celular não dá para ler "a aba aberta" como na extensão. Então o produto chega ao app de dois jeitos:

- **Colando o link** na tela Produto (por exemplo, o link copiado em "Compartilhar" no app da loja).
  O app abre a página e já começa a análise.
- **Abrindo uma loja** pelos botões da tela Produto (Mercado Livre, Amazon, KaBuM!, Magazine Luiza).
  A loja abre dentro do app; ao entrar na página de um produto aparece o botão **Analisar preço**.

Em qualquer página aberta no app, o mesmo leitor da extensão (`extrator.js`) é injetado para achar
título, preço, preço riscado e foto. O resto funciona como na extensão: veredito, gráfico dos
últimos 30 dias, Histórico, Alertas e Ajustes.

### Notificações dos alertas

Quando um produto com alerta chega ao preço que você quer, o celular mostra uma notificação do
sistema (barra de notificações, som e tela bloqueada). Tocar nela abre a tela Alertas. O app confere
os preços:

- ao abrir o app e ao voltar para ele;
- logo depois de criar um alerta (se o preço já estiver abaixo do valor, a notificação vem na hora);
- com o app fechado, no intervalo de **Verificar preços** (Ajustes). **Só no app instalado (APK)**:
  o Expo Go não roda tarefas em segundo plano no Android.

Cada alerta avisa uma vez. Avisa de novo se o preço cair mais ou se subir e depois voltar a cair.
O interruptor **Queda de preço** (Ajustes) liga e desliga essas notificações, e o botão
**Testar notificação** manda um aviso de exemplo depois de 5 segundos.

São notificações **locais**: o próprio celular busca os preços na API (`GET /produtos/{id}`) e cria
o aviso, sem push do servidor. Elas aparecem iguais às do WhatsApp. Push de verdade (enviado pelo
servidor) não funciona no Expo Go no Android desde o SDK 53.

O preço que o app vê é o último que o backend guardou para o produto, ou seja, o da última vez que
alguém abriu aquela página pelo app ou pela extensão.

No gráfico: **arraste o dedo** para ver o preço de cada dia, faça **pinça com dois dedos** para dar
zoom e **toque duas vezes** para voltar ao período inteiro.

## Usar o backend do seu PC

Por padrão o app usa o servidor no Render (`https://atala-ia-back.onrender.com`). Para usar o
backend rodando no seu computador:

1. Suba o backend aceitando conexões da rede (na pasta do atala-ia-back):

```bash
uvicorn app.main:app --reload --host 0.0.0.0
```

2. Descubra o IP do PC na rede (`ipconfig` no Windows) e inicie o app apontando para ele.
   No celular, `127.0.0.1` é o próprio celular, por isso precisa ser o IP do PC.

No PowerShell:

```bash
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:8000"; npx.cmd expo start --clear
```

No Linux/Mac:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000 npx expo start --clear
```

## Testar o visual no computador

```bash
npx expo start --web
```

Igual ao `popup.html` da extensão, dá para passar um produto pela URL:
`http://localhost:8081/?titulo=Fone&preco=199.90&preco_original=259.90`
(acrescente `&api=http://127.0.0.1:8000` para usar o backend local).
O navegador das lojas só funciona no celular.

## Onde está cada coisa

| Extensão (repositório `atala-ia`)     | App (este projeto)                               |
| ------------------------------------- | ------------------------------------------------ |
| `popup.html` + `src/script.js`        | `App.js` (cabeçalho, telas, barra de navegação)   |
| `src/input.css` (cores, modo escuro)  | `src/tema.js`                                    |
| `src/config.js`                       | `src/config.js`                                  |
| `src/api.js`                          | `src/api.js` e `src/formatacao.js`               |
| `src/extrator.js`                     | `src/extrator.js` (mesmo código, guardado como texto) |
| `chrome.tabs` + `chrome.scripting`    | `src/telas/Navegador.js` (loja aberta no app)    |
| `#home-page`                          | `src/telas/TelaInicio.js`                        |
| `#product-page` + gráfico do `app.js` | `src/telas/TelaProduto.js` + `src/componentes/GraficoPrecos.js` |
| `#history-page`                       | `src/telas/TelaHistorico.js`                     |
| `#alerts-page`                        | `src/telas/TelaAlertas.js`                       |
| `#settings-page`                      | `src/telas/TelaAjustes.js`                       |
| `#help-page`                          | `src/telas/TelaAjuda.js`                         |
| `chrome.storage` / `localStorage`     | `AsyncStorage` (mesmas chaves: `atalaHistorico`, `atalaAlertas`, `atalaPreferencias`, `theme`, `fontOffset`) |
| Ícones SVG da Lucide                  | `lucide-react-native` (os mesmos ícones)         |

**Importante:** ao mudar o `src/extrator.js` da extensão, copie a mudança para o `src/extrator.js` deste projeto.
Lá dentro não use crases nem `${` (o código fica dentro de um texto).

## Diferenças em relação à extensão

- O produto vem de um link colado ou da loja aberta dentro do app (não existe "aba atual" no celular).
- O gráfico usa gestos (arrastar, pinça, dois toques) no lugar de mouse e scroll.
- Histórico e Alertas podem ser atualizados puxando a lista para baixo.
- A tela Ajuda, que estava vazia na extensão, explica como usar o app.
- Tocar num produto do Histórico abre a página dele dentro do app.
- Como na extensão, o app não tem login, e as opções "Resumo semanal", "Analisar ao abrir uma loja"
  e "Moeda padrão" são salvas, mas ainda não mudam nada no funcionamento.

## Gerar o app instalável (APK)

Use o EAS Build da Expo (precisa de uma conta gratuita em expo.dev):

```bash
npx eas-cli@latest build:configure
```

```bash
npx eas-cli@latest build -p android --profile preview
```
