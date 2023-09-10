import fetch from "node-fetch";
import { expect } from "chai";
import { API_TEST_BASE_URL } from "./global-setup";

describe("document", () => {
  it("insert roundtrip", async () => {
    const documentsUrl = `${API_TEST_BASE_URL}/documents`;
    const newDocData = {
      name: "My dialogue",
      clones: null,
    };

    const postResp = await fetch(documentsUrl, {
      method: "POST",
      body: JSON.stringify(newDocData),
    }).then(r => r.json());

    expect(postResp).to.contain({
      id: 1,
    });

    const newDocUrl = `${API_TEST_BASE_URL}/documents/${postResp.id}`;
    const getResp = await fetch(newDocUrl).then(r => r.json());

    expect(getResp).to.deep.equal({
      id: postResp.id,
      ...newDocData,
    });
  });
});
