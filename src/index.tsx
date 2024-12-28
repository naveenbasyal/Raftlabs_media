import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Auth0Provider } from "@auth0/auth0-react";

import App from "./App";

import { ApolloProvider } from "@apollo/client";
import client from "./apolloClient";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const domain = process.env.REACT_APP_AUTH0_DOMAIN || "";

const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID || "";
root.render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: window.location.origin,
    }}
    cacheLocation="localstorage"
  >
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </Auth0Provider>
);
