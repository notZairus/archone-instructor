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

interface Classroom extends Timestamps {
  $id: number;
  name: string;
  description: string;
  code: string;
}
