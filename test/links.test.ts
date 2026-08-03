import assert from "node:assert/strict";
import test from "node:test";
import {
	isAllowedExternalHref,
	resolvePreviewLinkTarget,
} from "../src/core/links";

test("allows only supported external navigation schemes", () => {
	assert.equal(isAllowedExternalHref("https://example.com"), true);
	assert.equal(isAllowedExternalHref("HTTP://example.com"), true);
	assert.equal(isAllowedExternalHref("mailto:author@example.com"), true);
	assert.equal(
		isAllowedExternalHref("ftp://files.example.com/readme.txt"),
		true,
	);
	assert.equal(isAllowedExternalHref("javascript:alert(1)"), false);
	assert.equal(
		isAllowedExternalHref("data:text/html,<script>alert(1)</script>"),
		false,
	);
	assert.equal(isAllowedExternalHref("vbscript:msgbox(1)"), false);
	assert.equal(isAllowedExternalHref("custom:resource"), false);
});

test("classifies external links for browser opening", () => {
	assert.deepEqual(
		resolvePreviewLinkTarget(
			"file:///Users/jessy/docs/",
			"https://example.com/a b",
		),
		{
			type: "external",
			href: "https://example.com/a b",
		},
	);
	assert.deepEqual(
		resolvePreviewLinkTarget(
			"file:///Users/jessy/docs/",
			"mailto:author@example.com",
		),
		{
			type: "external",
			href: "mailto:author@example.com",
		},
	);
});

test("classifies same-document anchors without local file access", () => {
	assert.deepEqual(
		resolvePreviewLinkTarget("file:///Users/jessy/docs/", "#intro"),
		{
			type: "anchor",
			fragment: "intro",
		},
	);
});

test("classifies relative Markdown links with normalized local file URI and fragment", () => {
	assert.deepEqual(
		resolvePreviewLinkTarget(
			"file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/notes/",
			"../guide/入门 文档.md#%E7%AC%AC%E4%BA%8C%E7%AB%A0",
		),
		{
			type: "local",
			uri: "file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/guide/%E5%85%A5%E9%97%A8%20%E6%96%87%E6%A1%A3.md",
			fragment: "第二章",
		},
	);
});

test("classifies file URI links with the fragment separated from the target", () => {
	assert.deepEqual(
		resolvePreviewLinkTarget(
			"file:///Users/jessy/docs/",
			"file:///Users/jessy/docs/notes/guide.md#chapter-1",
		),
		{
			type: "local",
			uri: "file:///Users/jessy/docs/notes/guide.md",
			fragment: "chapter-1",
		},
	);
});
