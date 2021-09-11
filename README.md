[![version]][items]
[![install]][items]
[![downloads]][items]

<!-- PROJECT LOGO -->
<br />
<p align="center">
    <a href="https://github.com/olmedoluis/vscode-env-viewer">
        <img src="https://raw.githubusercontent.com/olmedoluis/vscode-env-viewer/main/media/logo/seahorse.png" alt="Logo" width="80" height="80">
    </a>
<h3 align="center"><a href="https://github.com/olmedoluis/vscode-env-viewer">ENV Viewer</a></h3>
    <p align="center">
        Interactive view for environment variables files
        <br />
        <a href="https://marketplace.visualstudio.com/items?itemName=oGranny.md-template"><strong>Visual studio market place</strong></a>
        <br />
        <br />
        <a href="https://github.com/olmedoluis/vscode-env-viewer/issues">Report Bug</a>
        •
        <a href="https://github.com/olmedoluis/vscode-env-viewer/issues">Request Feature</a>
    </p>
</p>

## About The Project

---

This extension allows you to change environment variables with a handy interface. You can easily search for variables, change their values by hand or leave default values to select.

I couldn't find a better way to organize environment variables. Even separating the variables with comments or also explaining with comments too, it never got better.

With this extension you will not have to rembember what values should be changed or what values that variable can take in order to get the desired result.

## Usage

---

Go to your .env file and click on the magnifying glass icon at the top right menu.

> 🛈 **You must use at least env-template tag** to let the extension know where values will be overwritten.

&nbsp;

There is three tags that can be used while writting out .env file:

### **Env Template Tag**:

---

This tag is meant to mark the values that will take effect over our application.

<p align="center">
  <img src="media/readme/env-template.gif" style="box-shadow: 0 5px 15px #11111170"/>
</p>

> 🛈 **They should be written without any comments or spaces between** since all those values can be overwritten by the user.

&nbsp;

#### **Code shown in the example:**

```ini
// @env-template
ENV=test
SITE_URL=www.test.com
ENV_VIEWER_REPO=test
KEY=secret_key_123
```

&nbsp;

### **Env Value Tag**:

---

This tag is meant to mark the values that a environment variable can take.

<p align="center">
  <img src="media/readme/env-values.gif" style="box-shadow: 0 5px 15px #11111170"/>
</p>

> 🛈 **They should be written without any comments or spaces between**.

&nbsp;

#### **Code shown in the example:**

```ini
// @env-template
ENV=test
SITE_URL=www.test.com
ENV_VIEWER_REPO=test
KEY=secret_key_123

// @env-value:ENV
//    test,prod
```

&nbsp;

### **Env Mode Tag**:

---

This tag is meant to mark a set of values that you can choose when should apply.

<p align="center">
  <img src="media/readme/env-modes.gif" style="box-shadow: 0 5px 15px #11111170"/>
</p>

&nbsp;

#### **Code shown in the example:**

```ini
// @env-template
ENV=prod
SITE_URL=www.prod.com
ENV_VIEWER_REPO=prod
KEY=secret_key_123

// @env-value:ENV
//    test,prod

// @env-mode:ENVIRONMENT.test
//    ENV=test
//    SITE_URL=www.test.com
//    ENV_VIEWER_REPO=test

// @env-mode:ENVIRONMENT.prod
//    ENV=prod
//    SITE_URL=www.prod.com
//    ENV_VIEWER_REPO=prod
```

&nbsp;

## License

MIT © Luis Olmedo

[items]: https://marketplace.visualstudio.com/items?itemName=luisolmedo.env-viewer
[downloads]: https://vsmarketplacebadge.apphb.com/downloads-short/luisolmedo.env-viewer.svg
[install]: https://vsmarketplacebadge.apphb.com/installs-short/luisolmedo.env-viewer.svg
[version]: https://vsmarketplacebadge.apphb.com/version/luisolmedo.env-viewer.svg
