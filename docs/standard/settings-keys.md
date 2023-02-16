---
description: Settings Keys are what Revolt uses to store user-defined settings.
---

# Settings Keys

### Example Usage

```javascript
// this is just a revolt.js example, replace 'collapsed' and it's data with whatever you're using
client.syncSetSettings({ collapsed: ["01GE586H4GP9G5T97VEDQSS76B"] });
```

{% hint style="info" %}
All Revolt settings keys are JSON-stringified. (revolt.js handles this automatically)
{% endhint %}

{% tabs %}
{% tab title="collapsed" %}
#### `collapsed`

An array of category IDs that are currently collapsed for the user.

<pre class="language-json"><code class="lang-json"><strong>"collapsed": ["01GGQPQ8CJ9J8B8FQ798W0QB32","01GEJQ02F2B4P7KC36SVK3P7PF"]
</strong></code></pre>
{% endtab %}
{% endtabs %}
