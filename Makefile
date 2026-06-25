.PHONY: install build watch test typecheck clean package publish

VERSION := $(shell node -p "require('./package.json').version")

install:
	npm ci

build:
	npm run compile

watch:
	npm run watch

test:
	npm test

typecheck:
	npm run typecheck

clean:
	rm -rf dist/ *.vsix

package: build
	npx vsce package -o markdown-lint-$(VERSION).vsix

publish: build
	npx vsce publish
