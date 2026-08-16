/**
 * header-clock — Host half.
 *
 * The plugin is a pure client-side UI plugin; the host half is an empty
 * plugin so the loader entry exists on the host side too (the web client
 * half is discovered through the `dsh.client` declaration in package.json).
 */
export default {
  apply() {
    // nothing to do on the host
  },
}
