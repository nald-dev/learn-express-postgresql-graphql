const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')

const { Pool } = require('pg')

const pool = new Pool({
  user: "nova",
  host: "localhost",
  database: "postgres",
  password: "",
  port: 5432,
  url: ""
})

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  # A book has a title and an author
  type Article {
    title: String
    content: String
    account: Account
  }

  type Account {
    username: String
    articles: [Article]
  }

  type Query {
    accounts: [Account]
    articles: [Article]
  }
`)

// The root provides a resolver function for each API endpoint
const root = {
  articles: async() => {
    let { rows: articlesSource } = await pool.query(`SELECT * FROM articles`)

    const accounts = await root.accounts()

    const articles = articlesSource.map(article => ({
      ...article,
      account: accounts.find(account => account.id === article.account_id)
    }))

    return articles
  },
  accounts: async() => {
    let { rows: accountsSource } = (await pool.query(`SELECT id, username FROM accounts`))

    const accounts = accountsSource.map(account => ({
      ...account,
      articles: async() => {
        const articles = await root.articles()

        return articles.filter(article => article.account_id === account.id)
      }
    }))

    return accounts
  }
}

const app = express()

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}))

app.listen(4000)

console.log('Running a GraphQL API server at http://localhost:4000/graphql')