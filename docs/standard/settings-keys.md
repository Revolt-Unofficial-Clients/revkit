---
description: Settings Keys are what Revolt uses to store user-defined settings.
---

# ⚙ Settings Keys

Toolset comes with methods for fetching and pushing settings into Revolt Sync.

## Get settings from Sync

### Example - Getting all settings

```typescript
client.syncFetchSettings().then((s) => {
    // "s" being the stringified json
    console.log(s);
})
```

### Example - Getting a single setting

```typescript
client.syncFetchSettings(["appearance"]).then((s) => {
    // "s" being the stringified json
    console.log(s);
})
```

## Set Sync settings

### Example - Setting collapsed to a new value

```javascript
// this is just a revolt.js example, replace 'collapsed' and it's data with whatever you're using
client.syncSetSettings({ collapsed: ["01GE586H4GP9G5T97VEDQSS76B"] });
```

{% hint style="info" %}
All revolt settings keys are JSON-stringified. (Toolset handles this automatically)
{% endhint %}

Below, there is some useful information for certain setting keys like types and what they do.

{% tabs %}
{% tab title="collapsed" %}
#### `collapsed`

An array of category IDs that are currently collapsed for the user.

<pre class="language-json"><code class="lang-json"><strong>"collapsed": ["01GGQPQ8CJ9J8B8FQ798W0QB32","01GEJQ02F2B4P7KC36SVK3P7PF"]
</strong></code></pre>
{% endtab %}

{% tab title="appearance" %}
**`appearance`**

Revite appearance settings

```typescript
{
    "appearance:emoji": string,
    "appearance:seasonal": boolean
}
```

`appearance:emoji` Current emoji pack (Needs to be `"mutant"`, `"twemoji"`, `"noto"`, `"fluent-3d"` or `"openmoji" (deprecated)`)

`appearance:seasonal` Whether should seasonal effects on the home screen appear
{% endtab %}

{% tab title="theme" %}
**`theme`**

Client theme overrides

```typescript
{
    "appearance:ligatures": boolean,
    "appearance:theme:base": string,
    "appearance:theme:css": string,
    "appearance:theme:font": string,
    "appearance:theme:monoFont": string,
    "appearance:theme:overrides": themeSettings
}
```

`appearance:ligatures` Whether to enable font ligatures

`appearance:theme:base` Theme base, Must be either dark or light.

`appearance:theme:css` Custom CSS Overrides

`appearance:theme:font` Font used in client

`appearance:theme:font` Monospaced Font used in codeblocks and inline codeblocks

`appearance:theme:overrides` Theme colour overrides
{% endtab %}

{% tab title="ordering" %}
**`ordering`**

Server ordering

```typescript
{
    "servers": string[]
}
```

`servers` Current server order in sidebar, strings inside the array must be a valid server ID.
{% endtab %}

{% tab title="locale" %}
**`locale`**

Current language, used for localization purposes

```typescript
{
    "lang": string
}
```

`lang` Must be a valid shorthand locale (See revolt's Weblate for the appropriate locales)
{% endtab %}
{% endtabs %}
