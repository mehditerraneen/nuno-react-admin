import React, { useState } from "react";
import { useLogin, useNotify } from "react-admin";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  MedicalServices,
} from "@mui/icons-material";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ username, password });
      notify("Welcome to Care Plan Admin!", { type: "success" });
    } catch (err) {
      setError("Invalid credentials. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setUsername("testdev");
    setPassword("testpass123");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 2,
      }}
    >
      <Card
        sx={{
          minWidth: 400,
          maxWidth: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "primary.main",
                color: "white",
                mb: 2,
              }}
            >
              <MedicalServices fontSize="large" />
            </Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Care Plan Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage care plans and patient data
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Demo Credentials Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Development Credentials:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              Username: <code>testdev</code>
              <br />
              Password: <code>testpass123</code>
            </Typography>
            <Button size="small" onClick={handleDemoLogin} sx={{ mt: 1 }}>
              Fill Demo Credentials
            </Button>
          </Alert>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              autoComplete="username"
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !username || !password}
              startIcon={
                loading ? <CircularProgress size={20} /> : <LoginIcon />
              }
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* Footer */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Secure authentication with JWT token management
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
