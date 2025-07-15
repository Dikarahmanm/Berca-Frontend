# Page snapshot

```yaml
- heading "Login" [level=2]
- paragraph: Welcome back, please enter your details
- text: Username
- textbox "Username": testuser
- text: Password
- textbox "Password": password
- link "Forgot password?":
  - /url: "#"
- button "Sign In"
- text: Invalid username or password.
- paragraph:
  - text: Don't have an account?
  - link "Sign up":
    - /url: /register
```