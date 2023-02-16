---
description: Remember to organize them well
---

# Creating a new project

To start development on your :sparkles: _brand-new client ****_ :sparkles: you need to create a new project

Creating Node.js projects is pretty straight forward and should take around 2–3 minutes, depending on your internet connection.

Run `npm create vite@latest` to create a new vite project and follow the steps

For this example I will use React, but If you want, you can use Solid, Svelte, Qwik, etc... (Alternatively, if you want to create a CLI client, you don't need to create a project using vite.)

{% file src="../.gitbook/assets/2023-02-16 14-05-55.mp4" %}
Video Containing the steps
{% endfile %}

After completing the steps shown in the video, install dependencies:

```bash
npm i revolt-toolset ws
```

We are installing `revolt-toolset` and it's peer dependency, `ws` (for web sockets)

And _voilà!_ You just created a React + Toolset project!
