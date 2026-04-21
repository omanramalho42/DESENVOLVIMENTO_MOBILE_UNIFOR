# Alimenta Mais

Aplicativo mobile desenvolvido com Expo e React Native. O projeto usa roteamento por arquivos, estilização com Tailwind/NativeWind, validação com Zod e gerenciamento de estado com Zustand.

## Tecnologias principais

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind e Tailwind CSS
- Zustand
- Zod
- Gluestack, como referência para UX/UI e componentes acessíveis

## Como rodar o projeto

Instale as dependências:

```bash
bun install
```

Inicie o app:

```bash
bun start
```

Também é possível usar os scripts do Expo:

```bash
bun run android
bun run ios
bun run web
```

## Estrutura inicial

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
  (tabs)/
    _layout.tsx
assets/
package.json
```

A pasta `app` é o centro da navegação. Como o projeto usa `expo-router`, cada arquivo e pasta dentro dela representa uma rota ou grupo de rotas.

## Bibliotecas e responsabilidades

### expo-router

Responsável pela navegação baseada em arquivos. Em vez de declarar todas as rotas manualmente, a estrutura da pasta `app` define as telas do aplicativo.

Exemplos importantes:

- `app/index.tsx`: rota inicial.
- `app/_layout.tsx`: layout raiz da aplicação.
- `app/(auth)`: grupo de rotas de autenticação.
- `app/(tabs)`: grupo de rotas com navegação por abas.

Esse modelo ajuda a manter a navegação mais organizada conforme o app cresce.

### react-native-safe-area-context

Usada para respeitar as areas seguras do dispositivo, como notch, barra de status e bordas arredondadas. Ela evita que conteúdo importante fique escondido ou colado nas extremidades da tela.

Deve ser considerada principalmente em telas com headers, tabs, botões fixos no rodapé e layouts full screen.

### react-native-screens

Melhora a performance da navegação usando recursos nativos de gerenciamento de telas. Na prática, ajuda o app a renderizar e transicionar telas de forma mais eficiente.

Ela trabalha junto com as bibliotecas de navegação usadas pelo Expo Router.

### react-native-reanimated

Biblioteca para animações fluidas e performáticas em React Native. É indicada para interações mais ricas, como:

- transições de tela;
- feedback visual em componentes;
- animações de entrada e saída;
- gestos combinados com movimento.

Como as animações rodam de forma otimizada, ela é preferível para animações que precisam parecer nativas.

### react-native-gesture-handler

Responsável por lidar com gestos nativos, como toque, arrastar, swipe e pan. É muito usada em conjunto com navegação, bottom sheets, carrosséis e componentes interativos.

Também combina bem com `react-native-reanimated` quando uma interação por gesto precisa gerar movimento na interface.

### Zustand

Gerenciador de estado simples e leve. Pode ser usado para estados globais que precisam ser acessados por várias telas, como:

- dados do usuário autenticado;
- sessão;
- preferências do app;
- filtros;
- estados compartilhados entre fluxos.

A ideia é evitar prop drilling e manter estados globais com uma API pequena e direta.

### Zod

Biblioteca para validação e tipagem de dados. É útil para garantir que formulários, respostas de API e objetos internos tenham o formato esperado.

Casos comuns no projeto:

- validar campos de login e cadastro;
- validar payloads antes de enviar para uma API;
- validar respostas recebidas do backend;
- reaproveitar schemas como fonte de tipos TypeScript.

### NativeWind

Permite usar classes no estilo Tailwind CSS em componentes React Native. Isso deixa a estilização mais rápida e padronizada.

Exemplo de uso esperado:

```tsx
<View className="flex-1 bg-white px-4">
  <Text className="text-lg font-semibold text-zinc-900">
    Alimenta Mais
  </Text>
</View>
```

### Tailwind CSS

Fornece a base de design tokens e classes utilitárias usadas pelo NativeWind. Ajuda a manter consistência de espaçamentos, cores, tamanhos, bordas e tipografia.

No contexto do React Native, o Tailwind é usado principalmente como padrão de estilo, enquanto o NativeWind faz a ponte com os componentes nativos.

## Gluestack e UX/UI

O Gluestack pode ser usado como base para criar uma interface consistente, acessível e escalável. Ele ajuda principalmente quando o app precisa de componentes reutilizáveis com bom comportamento visual e interativo.

Pontos mais importantes para UX/UI:

- Consistência: botões, inputs, textos, cards e feedbacks seguem o mesmo padrão visual.
- Acessibilidade: componentes podem ser estruturados com foco em leitura, toque, contraste e estados de interação.
- Produtividade: reduz o tempo gasto recriando componentes comuns.
- Escalabilidade: facilita manter um design system conforme novas telas são adicionadas.

Mesmo usando NativeWind para estilização, o Gluestack pode servir como camada de componentes. A combinação recomendada é:

- Gluestack para componentes base e padrões de interação.
- NativeWind/Tailwind para ajustes visuais, espaçamentos e composição de layout.
- Zod para validação de dados exibidos ou enviados pela interface.
- Zustand para estados compartilhados entre telas e fluxos.

## Padrões recomendados

- Manter telas dentro de `app`, respeitando a organização do Expo Router.
- Criar componentes reutilizáveis quando uma UI se repetir em mais de uma tela.
- Usar Zod em formulários e contratos de dados.
- Usar Zustand apenas para estado realmente compartilhado.
- Priorizar NativeWind/Tailwind para estilos simples e consistentes.
- Usar Reanimated e Gesture Handler quando a experiência exigir movimento ou gestos mais avançados.

## Scripts disponíveis

```bash
bun start       # inicia o Expo
bun run android # abre no Android
bun run ios     # abre no iOS
bun run web     # abre no navegador
bun run lint    # executa o lint
```
