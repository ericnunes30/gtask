# CLAUDE.md

# Estamos refatorando nosso backend para modularizar ele

## Regras para codificar:

- Princípios de Orientação a objetos utilizando princípios de SOLID.
- Seguir estritamente o principio de Open Closed Principe, as class devem estar abertas para extensão e fechadas para modificações.
- Utilizar quando necessário para organização de código os Padrões de projetos.
- Strategy: Exercitar o uso do polimorfismo, organizar metodos grandes em class separadas, concretas e dedicadas “ao método” usando o mesmo nome do método para que ele esteja disponivel em todas as outras class de baixo nível.
- Factory:  Resolve o problema de ter que ficar usando sempre validações com IFS, graças a este padrão de projetos conseguimos seguir o padrão de SOLID de que uma class principal nunca deve ser estendida e nunca modificada.
- Facade: Simplificar organização do código, como o fluxo de chamada de todas as service. Utilizar quando um mesmo serviço possui  vários pequenos pontos (Como várias APIs de integração, por exemplo).
- Adapter: Melhorar testes unitários e separação clara das class de Alto nível e baixo nível.
- Decorator: Facilitar a flexibilização de adição de novas funcionalidades, por exemplo encapsulando a funcionalidade anterior na nova class.
- Obsessão por tipos primitivos: Criar nosso próprio tipo e depois passar como parametro.
- Criar class com no maximo 50 linhas (Sempre que possível)
- Evitar métodos Getters e Setters.
- Adotar a prática de só ter 2 parametros por class (Ou seja, uma class  como ContactInfo encapsulando todas as informações de contato e na class de Customer incorporar o parametro ContactInfo e outro seguindo a mesma lógica).
- Adotar a LEI de DEMITER: Usar class de alto nivel, ou seja, usar métodos da class vizinha e nunca usar de class com métodos de baixo nível que estão “longe” da atual.
- Utilizar padrão State: class para representar os diversos estados do projeto