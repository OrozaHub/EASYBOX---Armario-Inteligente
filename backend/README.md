# EasyBox Smart Locker - Backend

Aqui está o código principal do servidor (Backend) para o armário inteligente que acabamos de planejar!
Eu inseri o projeto todo estruturado na pasta `c:\Users\Isael\Desktop\EASYBOX\backend`.

## Como executar esse projeto?

Parece que o seu terminal não estava com o `Node.js` e o `npm` reconhecidos no momento, então eu escrevi o código sem executar nada localmente por precaução. Para rodar o servidor na sua máquina:

1. **Instalar o Node.js**: Certifique-se de instalar o Node.js de [nodejs.org](https://nodejs.org/) (versão LTS).
2. Abra seu terminal, vá até a pasta e instale as dependências:
   ```bash
   cd Desktop\EASYBOX\backend
   npm install
   ```
3. **Criar o Banco de Dados Local (SQLite)**:
   ```bash
   npx prisma db push
   ```
4. **Rodar o Servidor em Modo de Desenvolvimento**:
   ```bash
   npm run dev
   ```

## O que tem aqui?

- `prisma/schema.prisma`: A modelagem completa do Banco de Dados (Usuários, Armários, Slots e Reservas).
- `src/routes/admin.routes.ts`: Para cadastrar os armários e os seus compartimentos (Ex: criar o Slot 1 Tamanho M).
- `src/routes/resident.routes.ts`: Para o morador solicitar o uso e gerar o código de entrega (*codigo_entrega* aleatório).
- `src/routes/iot.routes.ts`: **O cérebro da máquina!** É a rota onde o teclado físico do armário vai enviar o código digitado. Se for de entrega, ele abre. Diferencia entrega e retirada e invalida o código assim que a porta fecha (`/door-closed`).
