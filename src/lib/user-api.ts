import { UserLogIn, UserRegistered, ErrorResponse } from "@/lib/types";
import axios from "axios";
export const API_USER_CRUD_DEV = import.meta.env.VITE_BACKEND_USER_CRUD_DEV;

const api = axios.create({
  baseURL: API_USER_CRUD_DEV,
});

export async function resetPassword(userPassword: {
  password: string;
  verifyPassword: string;
  id: string;
  token: string;
}): Promise<{ data: UserLogIn | ErrorResponse; status: number }> {
  try {
    const res = await api.post<UserLogIn>(`/reset-password`, userPassword);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}

export async function forgotPassword(userPassObject: {
  email: string;
}): Promise<{ data: UserLogIn | ErrorResponse; status: number }> {
  try {
    const res = await api.post<UserLogIn>(`/forgot-password`, userPassObject);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}

export async function registerUser(userObject: {
  name: string;
  lastname: string;
  email: string;
  password: string;
}): Promise<{ data: UserRegistered | ErrorResponse; status: number }> {
  try {
    const res = await api.post<UserRegistered>(`/create-user`, userObject);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}

export async function loginUser(userObjectLog: {
  email: string;
  password: string;
}): Promise<{ data: UserLogIn | ErrorResponse; status: number }> {
  try {
    const res = await api.post<UserLogIn>(`/login`, userObjectLog);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}

export async function autoLogin(): Promise<{
  data: UserLogIn | ErrorResponse;
  status: number;
}> {
  try {
    const token = localStorage.getItem("accessToken");
    // Check if the token is empty or null
    if (!token) {
      throw new Error("Access token is missing.");
    }
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const res = await api.get<UserLogIn>(`/auth-user`, config);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}

export async function logOutUser(): Promise<{
  data: UserLogIn | ErrorResponse;
  status: number;
}> {
  try {
    const token = localStorage.getItem("accessToken");
    console.log(token);
    if (!token) {
      throw new Error("Access token is missing.");
    }
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const res = await api.get<UserLogIn>(`/logout`, config);
    return { data: res.data, status: res.status }; // Return both data and status
  } catch (error) {
    // Handle errors from axios
    if (axios.isAxiosError(error) && error.response) {
      const errorData: ErrorResponse = error.response.data; // Get the error response data
      return { data: errorData, status: error.response.status }; // Return error data and status code
    } else {
      // Handle unexpected errors
      return {
        data: {
          error: "Unexpected Error",
          message: "An unexpected error occurred.",
        },
        status: 500,
      };
    }
  }
}
