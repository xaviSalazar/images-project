import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormik } from "formik";
import * as Yup from "yup";
import { registerUser } from "@/lib/user-api"; // Adjust the import path as necessary
import { toast } from "@/components/ui/use-toast";
import GoogleAuth from "@/components/authentication/components/auth-google"
import { useStore } from "@/lib/states";


export const description =
  "A sign up form with first name, last name, email and password inside a card. There's an option to sign up with GitHub and a link to login if you already have an account";

export const iframeHeight = "600px";

export const containerClassName =
  "w-full h-screen flex items-center justify-center px-4";

const validationSchema = Yup.object({
  name: Yup.string().required("First name is required"),
  lastname: Yup.string().required("Last name is required"),
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
  verifyPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Verify Password is required"),
});

export default function LoginForm() {
  const [isLoggedIn] = useStore((state) => [
    state.isLoggedIn,
  ]);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isLoggedIn) navigate("/images-project");
  }, [isLoggedIn]);

  const formik = useFormik({
    initialValues: {
      name: "",
      lastname: "",
      email: "",
      password: "",
      verifyPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Add the host URL to the form values
        const hostUrl = window.location.href;
        const baseUrl = hostUrl.substring(0, hostUrl.indexOf("#/") + 2);
        const updatedValues = { ...values, host: baseUrl };
        const { data, status } = await registerUser(updatedValues); // Destructure to get data and status
        if (status === 200) {
          navigate("/login");
          toast({
            variant: "success",
            title: "REGISTRATION SUCCESS:",
            description: `Login with your created credentials`,
          });
        }
        if (status === 500) {
          toast({
            variant: "destructive",
            title: "REGISTRATION FAILED",
            description: "USER ALREADY EXISTS",
          });
        }
      } catch (error) {
        console.error("Error registering user:", error);
      }
    },
  });

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                name="name"
                placeholder="Max"
                required
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-sm">{formik.errors.name}</div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                name="lastname"
                placeholder="Robinson"
                required
                value={formik.values.lastname}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.lastname && formik.errors.lastname && (
                <div className="text-red-500 text-sm">
                  {formik.errors.lastname}
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.email && formik.errors.email && (
              <div className="text-red-500 text-sm">{formik.errors.email}</div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.password && formik.errors.password && (
              <div className="text-red-500 text-sm">
                {formik.errors.password}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="verify-password">Verify Password</Label>
            <Input
              id="verify-password"
              name="verifyPassword"
              type="password"
              required
              value={formik.values.verifyPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.verifyPassword && formik.errors.verifyPassword && (
              <div className="text-red-500 text-sm">
                {formik.errors.verifyPassword}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full">
            Create an account
          </Button>
          <GoogleAuth />
          {/* <Button variant="outline" className="w-full">
            <Icons.google className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button> */}
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
