import React from "react";
import gql from "graphql-tag";
import { Query } from "react-apollo";
import Link from "next/link";
import { perPage } from "../config";
import PaginationStyles from "./styles/PaginationStyles";

const PAGINATION_QUERY = gql`
  query PAGINATION_QUERY {
    itemsConnection {
      aggregate {
        count
      }
    }
  }
`;

const Pagination = ({ page }) => {
  return (
    <Query query={PAGINATION_QUERY}>
      {({ data, loading, error }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error</p>;
        const count = data.itemsConnection.aggregate.count;
        const pages = Math.ceil(count / perPage);
        return (
          <PaginationStyles>
            <Link
              prefetch
              href={{
                pathname: "items",
                query: {
                  page: page - 1
                }
              }}
            >
              <a className="prev" aria-disabled={page <= 1}>
                &#x2190; Prev
              </a>
            </Link>
            <p>
              Page {page} of {pages}
            </p>
            <p>{count} items total</p>
            <Link
              prefetch
              href={{
                pathname: "items",
                query: {
                  page: page + 1
                }
              }}
            >
              <a className="next" aria-disabled={page >= pages}>
                Next &#x2192;
              </a>
            </Link>
          </PaginationStyles>
        );
      }}
    </Query>
  );
};

export default Pagination;
