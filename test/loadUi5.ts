const scriptTag = document.createElement("script");
scriptTag.src = "https://sdk.openui5.org/resources/sap-ui-core.js";

document.body.appendChild(scriptTag);

await new Promise<void>((resolve) => {
  scriptTag.onload = () => {
    resolve();
  };
});
