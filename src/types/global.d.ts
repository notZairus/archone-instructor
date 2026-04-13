type Timestamps = {
  $createdAt?: string;
  $updatedAt?: string;
};

interface User extends Timestamps {
  $id: string;
  name: string;
  email: string;
  role?: string;
}
