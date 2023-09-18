import fetch from "node-fetch";
import { expect } from "chai";
import { API_TEST_BASE_URL } from "./global-setup";
import { Document, DocumentPost } from "../../../common/api/types";

// FIXME: replace with e2e playwright tests

describe("document", () => {
  it("insert roundtrip", async () => {
    const newDocData: DocumentPost = {
      name: "My dialogue",
      jsonContents: JSON.stringify({}),
    };

    // FIXME: use isomorphic fetch package
    const postResp = await fetch(`${API_TEST_BASE_URL}/users/me/documents`, {
      method: "POST",
      body: JSON.stringify(newDocData),
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(r => r.json());

    const getResp = await fetch(`${API_TEST_BASE_URL}/users/me/documents/${postResp.id}`)
      .then(r => r.json() as Promise<Document>);

    expect(getResp).to.deep.equal({
      id: postResp.id,
      ...newDocData,
    });
  });
});
