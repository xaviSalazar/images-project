import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { useStore } from "@/lib/states";

export const description =
  "A sign up form with first name, last name, email and password inside a card. There's an option to sign up with GitHub and a link to login if you already have an account";

export const iframeHeight = "600px";

export const containerClassName =
  "w-full h-screen flex items-center justify-center px-4";

const validationSchema = Yup.object({
  password: Yup.string().required("Password is required"),
  verifyPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Verify Password is required"),
});

export default function ResetPassForm() {
  const location = useLocation();
  const [resetPassword, isLoading, isLoggedIn] = useStore((state) => [
    state.resetPassword,
    state.isLoading,
    state.isLoggedIn,
  ]);

  const formik = useFormik({
    initialValues: {
      password: "",
      verifyPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      const queryParams = new URLSearchParams(location.search);
      const id = queryParams.get('id');
      const token = queryParams.get('token');
      const updatedValues = {...values, id: id, token: token};
      resetPassword(updatedValues)
    },
  });

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          Enter your new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={formik.handleSubmit} className="grid gap-4">
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
            Reset password
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Did you change your password?{" "}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
