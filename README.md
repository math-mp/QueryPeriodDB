Primeira vez em uma máquina nova

Comece instalando o Node.js (versão 18 ou mais nova) e o XAMPP; se já estiverem instalados, pule essa parte. Depois abra o XAMPP Control Panel e clique em Start no MySQL e no Apache: o MySQL guarda o banco, e o Apache só é necessário para abrir o phpMyAdmin.

Em seguida, abra a pasta do repositório no VS Code (a que tem o server.js, o routes.js e o database.js) e abra o terminal integrado dentro dela. Rode npm install, que baixa o express e o mysql2 para a pasta node_modules. Isso precisa ser feito uma vez por máquina, porque essa pasta não vai no repositório. Logo depois rode npm start. Esse primeiro start cria sozinho o banco grade_escolar e as tabelas, e quando aparecer a mensagem do servidor em http://localhost:3000 o banco já existe. Pode deixar o servidor rodando.

Agora abra o phpMyAdmin no navegador, em http://localhost/phpmyadmin (ou pelo botão Admin na linha do MySQL no XAMPP). Na barra da esquerda, o banco grade_escolar já deve estar na lista. Clique nele e, na aba Importar, escolha o arquivo dados_pdf.sql e clique em Importar no fim da página. Se preferir, abra o arquivo no Bloco de Notas, copie tudo, cole na aba SQL e clique em Executar. No final, o resultado deve mostrar total_aulas = 237.

Com isso feito, acesse http://localhost:3000. A grade, as buscas e a aba Adições já devem mostrar os dados do PDF, e a partir daí tudo fica salvo no MySQL daquela máquina.

No dia a dia

Nas próximas vezes, ligue apenas o MySQL no XAMPP, rode npm start no VS Code e abra localhost:3000. Não rode o dados_pdf.sql de novo, porque a grade dá erro de duplicidade. O Apache só precisa ficar ligado quando você quiser mexer direto no banco pelo phpMyAdmin.
