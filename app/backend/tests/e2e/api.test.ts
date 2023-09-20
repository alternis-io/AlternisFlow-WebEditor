import fetch from "node-fetch";
import { expect } from "chai";
import { API_TEST_BASE_URL } from "./global-setup";
import { Document, User, WithToken } from "../../src/prisma";

// FIXME: replace with e2e playwright tests

describe("document", () => {
  it("insert roundtrip", async () => {
    const newUser: Partial<User> = {
      email: "me@me.com",
    };

    const newUserResp = await fetch(`${API_TEST_BASE_URL}/users/me`, {
      method: "POST",
      body: JSON.stringify(newUser),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()) as User;

    expect(newUserResp.token);

    const newDoc: Partial<Document & WithToken> = {
      name: "My dialogue",
      jsonContents: JSON.stringify({}),
      token: newUserResp.token!,
    };

    // FIXME: use isomorphic fetch package
    const postResp = await fetch(`${API_TEST_BASE_URL}/users/me/documents`, {
      method: "POST",
      body: JSON.stringify(newDoc),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());

    const getResp = await fetch(`${API_TEST_BASE_URL}/users/me/documents/${postResp.id}`)
      .then(r => r.json() as Promise<Document>);

    expect(getResp).to.deep.equal({
      id: postResp.id,
      ...newDoc,
    });
  });
});
