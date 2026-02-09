
import React from 'react';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

export const router = {
  routes: [
    {
      path: "/",
      element: <Index />,
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ]
};
