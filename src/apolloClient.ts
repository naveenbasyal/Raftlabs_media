import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT || "",
  cache: new InMemoryCache(),
  headers: {
    apiKey: process.env.REACT_APP_GRAPHQL_API_KEY || "",
  },
});

export default client;
