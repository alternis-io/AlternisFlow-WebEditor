import React from "react";

export const MailLink = (props: { email: string }) => <a href={`mailto:${props.email}`}>{props.email}</a>;
